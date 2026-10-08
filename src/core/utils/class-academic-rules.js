const requiresDepartment = (classLevelCode) => String(classLevelCode || "").toUpperCase().startsWith("SS");

module.exports = { requiresDepartment };
