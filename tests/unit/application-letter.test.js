const assert = require("node:assert/strict");
const test = require("node:test");
const { Readable } = require("node:stream");
const {
  MAX_APPLICATION_LETTER_BYTES,
  uploadApplicationLetter,
  validateApplicationLetter,
} = require("../../src/core/middleware/application-letter.middleware");

const runValidation = (req) => new Promise((resolve) => {
  validateApplicationLetter(req, {}, (error) => resolve(error || null));
});

const runUpload = (fileSize) => new Promise((resolve) => {
  const boundary = "application-letter-test-boundary";
  const content = Buffer.alloc(fileSize);
  content.write("%PDF-1.7");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="role"\r\n\r\nTEACHER\r\n--${boundary}\r\nContent-Disposition: form-data; name="applicationLetter"; filename="letter.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const req = Readable.from([body]);
  req.headers = {
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "content-length": String(body.length),
  };
  req.method = "POST";
  uploadApplicationLetter(req, {}, (error) => resolve({ error, file: req.file }));
});

test("teacher applications require an application letter", async () => {
  const error = await runValidation({ body: { role: "TEACHER" } });
  assert.equal(error.statusCode, 422);
  assert.equal(error.code, "TEACHER_APPLICATION_LETTER_REQUIRED");
});

test("non-teacher applications do not require an application letter", async () => {
  assert.equal(await runValidation({ body: { role: "STUDENT" } }), null);
});

test("application letters are only accepted for teacher applications", async () => {
  const error = await runValidation({
    body: { role: "STUDENT" },
    file: { originalname: "letter.pdf", buffer: Buffer.from("%PDF-1.7") },
  });
  assert.equal(error.code, "APPLICATION_LETTER_ROLE_INVALID");
});

test("valid PDF application letters are accepted and invalid document signatures are rejected", async () => {
  const valid = await runValidation({
    body: { role: "TEACHER" },
    file: { originalname: "letter.pdf", buffer: Buffer.from("%PDF-1.7") },
  });
  assert.equal(valid, null);

  const invalid = await runValidation({
    body: { role: "TEACHER" },
    file: { originalname: "letter.pdf", buffer: Buffer.from("not a PDF") },
  });
  assert.equal(invalid.code, "INVALID_APPLICATION_LETTER_CONTENT");
});

test("application letter accepts exactly 115 KB and rejects larger files", async () => {
  assert.equal(MAX_APPLICATION_LETTER_BYTES, 115 * 1024);

  const withinLimit = await runUpload(MAX_APPLICATION_LETTER_BYTES);
  assert.ifError(withinLimit.error);
  assert.equal(withinLimit.file.size, MAX_APPLICATION_LETTER_BYTES);

  const overLimit = await runUpload(MAX_APPLICATION_LETTER_BYTES + 1);
  assert.equal(overLimit.error.statusCode, 413);
  assert.equal(overLimit.error.code, "APPLICATION_LETTER_TOO_LARGE");
});
