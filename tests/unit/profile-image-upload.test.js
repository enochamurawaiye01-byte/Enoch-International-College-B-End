const test = require("node:test");
const assert = require("node:assert/strict");
const { detectImageMime, validateImageContent } = require("../../src/core/middleware/upload.middleware");

test("detects supported image signatures instead of trusting filenames", () => {
  assert.equal(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageMime(Buffer.from("RIFF0000WEBP")), "image/webp");
  assert.equal(detectImageMime(Buffer.from("not an image")), null);
});

test("rejects extension, declared MIME and content mismatches", async () => {
  const file = {
    originalname: "photo.png",
    mimetype: "image/png",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  };
  const error = await new Promise((resolve) => validateImageContent({ file }, {}, resolve));
  assert.equal(error.code, "INVALID_PROFILE_IMAGE");
});

test("accepts correctly labelled JPEG image content", async () => {
  const file = {
    originalname: "photo.jpg",
    mimetype: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  };
  const result = await new Promise((resolve) => validateImageContent({ file }, {}, resolve));
  assert.equal(result, undefined);
});
