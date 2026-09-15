const generateApplicationNumber = async (tx) => {
	const year = new Date().getFullYear();
	while (true) {
		const number = `ADM-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
		const existing = await tx.admission.findUnique({ where: { applicationNumber: number } });
		if (!existing) return number;
	}
};

module.exports = { generateApplicationNumber };
