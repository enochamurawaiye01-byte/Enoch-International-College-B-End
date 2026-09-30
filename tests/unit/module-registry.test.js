const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIONS, MODULE_REGISTRY } = require("../../src/modules/permissions/module-registry");

test("centralized module registry covers the real 56 modules and valid frontend paths", () => {
  const keys = MODULE_REGISTRY.map((module) => module.key);
  assert.equal(MODULE_REGISTRY.length, 56);
  assert.equal(new Set(keys).size, 56);
  assert.deepEqual(ACTIONS, ["view", "create", "edit", "delete", "approve", "export", "manage"]);

  const frontendRoot = path.resolve(__dirname, "../../../enoch-erp-frontend");
  for (const module of MODULE_REGISTRY) {
    assert.ok(module.displayName, `${module.key} has a display name`);
    assert.deepEqual(module.actions, ACTIONS);
    for (const frontendRoute of module.frontendRoutes) {
      const absolutePath = path.resolve(frontendRoot, `.${frontendRoute}`);
      assert.ok(absolutePath.startsWith(frontendRoot + path.sep), `${frontendRoute} remains inside the frontend root`);
      assert.ok(fs.existsSync(absolutePath), `${module.key} maps to an existing frontend route: ${frontendRoute}`);
    }
  }
});