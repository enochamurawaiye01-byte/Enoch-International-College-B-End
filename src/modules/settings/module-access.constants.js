const MODULE_ACCESS_ERRORS = {
    INVALID_MODULE: "Module name is invalid.",
    MODULE_DISABLED: "This module is currently disabled.",
    OUTSIDE_TIME_WINDOW: "This module is not available at this time.",
    PAYMENT_REQUIRED: "Outstanding fees restrict access to this module.",
};

const { MODULE_REGISTRY } = require("../permissions/module-registry");
const MODULE_KEYS = MODULE_REGISTRY.filter(({ apiRoute }) => apiRoute).map(({ apiRoute }) => apiRoute.replace(/^\//, ""));

module.exports = { MODULE_ACCESS_ERRORS, MODULE_KEYS };