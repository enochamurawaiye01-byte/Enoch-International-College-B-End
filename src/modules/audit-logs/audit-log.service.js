const repository = require("./audit-log.repository");
const { buildWhere } = require("./audit-log.utils");
const list = async (query) => {
	const page = Number(query.page) || 1;
	const pageSize = Number(query.pageSize) || 25;
	const where = buildWhere(query);
	const [data, total] = await Promise.all([
		repository.findAll(where, (page - 1) * pageSize, pageSize),
		repository.count(where),
	]);
	return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};
module.exports = { list };
