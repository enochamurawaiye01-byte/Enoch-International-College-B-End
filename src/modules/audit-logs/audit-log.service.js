const repository = require("./audit-log.repository");
const { buildWhere } = require("./audit-log.utils");
const list = (query) => repository.findAll(buildWhere(query));
module.exports = { list };
