const assert = require("node:assert/strict");
const test = require("node:test");
const { audienceRoles, audiencesForRole, isAdmin } = require("../../src/modules/announcements/announcement.utils");

test("announcement audiences resolve to the database user roles", () => {
  assert.deepEqual(audienceRoles("STUDENTS"), ["STUDENT"]);
  assert.ok(audienceRoles("MANAGEMENT").includes("PRINCIPAL"));
  assert.ok(audienceRoles("STAFF").includes("LIBRARIAN"));
  assert.deepEqual(audiencesForRole("PRINCIPAL"), ["ALL", "MANAGEMENT"]);
  assert.deepEqual(audiencesForRole("STUDENT"), ["ALL", "STUDENTS"]);
});

test("only configured announcement managers can manage announcements", () => {
  assert.equal(isAdmin("ADMIN"), true);
  assert.equal(isAdmin("PRINCIPAL"), true);
  assert.equal(isAdmin("TEACHER"), false);
});
