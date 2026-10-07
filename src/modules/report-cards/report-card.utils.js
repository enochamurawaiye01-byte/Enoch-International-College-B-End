const sum = (values) => values.reduce((total, value) => total + (value == null ? 0 : Number(value)), 0);
const DEFAULT_ASSESSMENT_CONFIGURATION = Object.freeze({
	firstTestMax: 20,
	secondTestMax: 20,
	examMax: 60,
	gradeBands: [
		{ minimum: 70, grade: "A", remark: "Excellent" },
		{ minimum: 60, grade: "B", remark: "Very Good" },
		{ minimum: 50, grade: "C", remark: "Good" },
		{ minimum: 45, grade: "D", remark: "Pass" },
		{ minimum: 0, grade: "F", remark: "Needs Improvement" }
	]
});

const calculateAssessment = (scores, configuration = DEFAULT_ASSESSMENT_CONFIGURATION) => {
	const components = [
		["firstTest", configuration.firstTestMax],
		["secondTest", configuration.secondTestMax],
		["exam", configuration.examMax]
	];
	for (const [field, maximum] of components) {
		const value = Number(scores[field] ?? 0);
		if (!Number.isFinite(value) || value < 0 || value > Number(maximum)) {
			const error = new RangeError(`${field} must be between 0 and ${maximum}.`);
			error.field = field;
			throw error;
		}
	}

	const total = sum(components.map(([field]) => scores[field] ?? 0));
	const totalPossible = sum(components.map(([, maximum]) => maximum));
	const percentage = totalPossible ? (total / totalPossible) * 100 : 0;
	const bands = [...(configuration.gradeBands || DEFAULT_ASSESSMENT_CONFIGURATION.gradeBands)]
		.sort((left, right) => Number(right.minimum) - Number(left.minimum));
	const band = bands.find((item) => percentage >= Number(item.minimum));
	return {
		total,
		totalPossible,
		percentage,
		grade: band?.grade || "F",
		remark: band?.remark || "Needs Improvement"
	};
};

const gradeFor = (percentage, gradeBands = DEFAULT_ASSESSMENT_CONFIGURATION.gradeBands) => {
	const value = Number(percentage);
	return [...gradeBands]
		.sort((left, right) => Number(right.minimum) - Number(left.minimum))
		.find((band) => value >= Number(band.minimum))?.grade || "F";
};

const canEnterTermAssessment = (classLevelCode, termType) => {
	const graduatingClass = ["JSS3", "SS3"].includes(String(classLevelCode).toUpperCase());
	return !(graduatingClass && String(termType).toUpperCase() === "THIRD");
};

const reportCardPublicationState = (report, { published, portal }) => {
	const studentPublished = portal === "student" ? published : portal ? report.studentPublished : published;
	const parentPublished = portal === "parent" ? published : portal ? report.parentPublished : published;
	return { studentPublished, parentPublished, published: studentPublished || parentPublished };
};

const reportCardPortalPublicationUpdate = (portal, published, otherPortalPublished) => ({
	[portal === "student" ? "studentPublished" : "parentPublished"]: published,
	published: published || otherPortalPublished,
});

module.exports = {
	DEFAULT_ASSESSMENT_CONFIGURATION,
	calculateAssessment,
	canEnterTermAssessment,
	gradeFor,
	sum,
	reportCardPublicationState,
	reportCardPortalPublicationUpdate,
};
