const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/timetable/timetable.repository");
const storage = require("../../src/config/storage");
const timetableService = require("../../src/modules/timetable/timetable.service");

test("class timetable file uploads", async (t) => {
  const originals = {
    findClass: repository.findClass,
    findActiveSessionWithTerm: repository.findActiveSessionWithTerm,
    findClassTermTimetable: repository.findClassTermTimetable,
    upsertClassFile: repository.upsertClassFile,
    uploadFile: storage.uploadFile,
    getFileUrl: storage.getFileUrl,
    removeStoredFile: storage.removeStoredFile,
  };

  t.after(() => {
    Object.assign(repository, {
      findClass: originals.findClass,
      findActiveSessionWithTerm: originals.findActiveSessionWithTerm,
      findClassTermTimetable: originals.findClassTermTimetable,
      upsertClassFile: originals.upsertClassFile,
    });
    Object.assign(storage, {
      uploadFile: originals.uploadFile,
      getFileUrl: originals.getFileUrl,
      removeStoredFile: originals.removeStoredFile,
    });
  });

  await t.test("rejects non-admin uploads", async () => {
    await assert.rejects(
      timetableService.uploadClassFile("class-1", { originalname: "schedule.pdf" }, { role: "TEACHER" }),
      (error) => error.code === "TIMETABLE_UPLOAD_DENIED" && error.statusCode === 403,
    );
  });

  await t.test("requires an active session and term", async () => {
    repository.findClass = async () => ({ id: "class-1", isActive: true });
    repository.findActiveSessionWithTerm = async () => null;
    await assert.rejects(
      timetableService.uploadClassFile("class-1", { originalname: "schedule.pdf" }, { role: "ADMIN" }),
      (error) => error.code === "ACTIVE_ACADEMIC_TERM_REQUIRED" && error.statusCode === 409,
    );
  });

  await t.test("uploads and returns the class timetable file in the active term", async () => {
    let received;
    repository.findClass = async () => ({ id: "class-1", isActive: true });
    repository.findActiveSessionWithTerm = async (schoolId) => {
      assert.equal(schoolId, "school-1");
      return { id: "session-1", terms: [{ id: "term-1" }] };
    };
    repository.findClassTermTimetable = async () => null;
    storage.uploadFile = async ({ file, folder }) => {
      assert.equal(file.originalname, "schedule.pdf");
      assert.equal(folder, "timetables/session-1/class-1");
      return { storageReference: "supabase://school-media/schedule.pdf" };
    };
    storage.getFileUrl = async (reference) => `https://media.example/${reference.split("/").pop()}`;
    repository.upsertClassFile = async (data) => {
      received = data;
      return { ...data, class: { id: data.classId, name: "JSS 1" } };
    };

    const result = await timetableService.uploadClassFile(
      "class-1",
      { originalname: "schedule.pdf" },
      { role: "ADMIN", schoolId: "school-1" },
    );

    assert.deepEqual(received, {
      sessionId: "session-1",
      termId: "term-1",
      classId: "class-1",
      scheduleFileUrl: "supabase://school-media/schedule.pdf",
      scheduleFileName: "schedule.pdf",
    });
    assert.equal(result.scheduleFileUrl, "https://media.example/schedule.pdf");
  });
});
