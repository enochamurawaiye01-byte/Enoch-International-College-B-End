const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/teachers/teacher.repository");
const { prisma } = require("../../src/config/database");
const teacherService = require("../../src/modules/teachers/teacher.service");

test("activating an inactive teacher triggers the Klaviyo employment approval flow", async () => {
  const originalFindById = repository.findById;
  const originalUpdate = repository.update;
  const originalUserUpdate = prisma.user.update;
  const originalFetch = global.fetch;
  const originalPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const originalApiKey = process.env.KLAVIYO_API_KEY;
  const events = [];
  const teacher = {
    id: "staff-1",
    firstName: "Daniel",
    lastName: "Teacher",
    staffNumber: "MIC/STF/0123456789ABCDEF",
    profileImageUrl: null,
    teacherAssignments: [],
    user: {
      id: "user-1",
      fullName: "Daniel Teacher",
      email: "daniel@school.invalid",
      role: "TEACHER",
      status: "INACTIVE",
    },
    department: { name: "Science" },
  };

  process.env.KLAVIYO_PRIVATE_API_KEY = "klaviyo-test-key";
  global.fetch = async (_url, options) => {
    events.push(JSON.parse(options.body).data.attributes);
    return { status: 202, ok: true, json: async () => ({}) };
  };

  try {
    repository.findById = async () => teacher;
    repository.update = async (_id, data) => {
      teacher.status = data.status;
      return teacher;
    };
    prisma.user.update = async ({ data }) => {
      teacher.user.status = data.status;
      return teacher.user;
    };

    const result = await teacherService.changeStatus("staff-1", "ACTIVE");

    assert.equal(events.length, 1);
    assert.equal(events[0].profile.data.attributes.email, "daniel@school.invalid");
    assert.equal(events[0].properties.role, "TEACHER");
    assert.equal(events[0].properties.letter_type, "Teacher Employment Letter");
    assert.equal(events[0].properties.registration_number, "MIC/STF/0123456789ABCDEF");
    assert.equal(events[0].properties.department, "Science");
    assert.equal(result.communication.email, true);
  } finally {
    repository.findById = originalFindById;
    repository.update = originalUpdate;
    prisma.user.update = originalUserUpdate;
    global.fetch = originalFetch;
    if (originalPrivateKey === undefined) delete process.env.KLAVIYO_PRIVATE_API_KEY;
    else process.env.KLAVIYO_PRIVATE_API_KEY = originalPrivateKey;
    if (originalApiKey === undefined) delete process.env.KLAVIYO_API_KEY;
    else process.env.KLAVIYO_API_KEY = originalApiKey;
  }
});
