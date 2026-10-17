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

test("disabled module policies reject API access", async () => {
  const originalGet = repository.get;
  repository.get = async (_schoolId, module, classLevelId) => {
    if (module !== "subjects") return null;
    return {
      value: JSON.stringify({
        module,
        classLevelId: classLevelId || null,
        enabled: classLevelId ? true : false,
      }),
    };
  };

  try {
    await assert.rejects(
      service.assertAccess({ schoolId: "test-school", module: "subjects", classLevelId: "class-level-id" }),
      (error) => error.code === "MODULE_DISABLED" && error.statusCode === 403
    );
  } finally {
    repository.get = originalGet;
  }
});
