const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../../src/modules/settings/module-access.repository");
const service = require("../../src/modules/settings/module-access.service");
const { MODULE_KEYS } = require("../../src/modules/settings/module-access.constants");

test("module access lists every unconfigured module as enabled", async () => {
  const originalFindAll = repository.findAll;
  repository.findAll = async () => [];

  try {
    const policies = await service.list("test-school");
    assert.equal(policies.length, MODULE_KEYS.length);
    assert.deepEqual(new Set(policies.map(({ module }) => module)), new Set(MODULE_KEYS));
    assert.ok(policies.every(({ enabled }) => enabled));
  } finally {
    repository.findAll = originalFindAll;
  }
});
