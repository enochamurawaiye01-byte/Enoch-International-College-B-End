// AcademicSession utils
const sessionNameRegex = /^\d{4}\/\d{4}$/;

const validateSessionName = (name) => {
    if (!sessionNameRegex.test(name)) {
        return false;
    }

    const [startYear, endYear] = name.split("/").map(Number);

    return endYear === startYear + 1;
};

const getSessionYears = (name) => {
    if (!validateSessionName(name)) {
        throw new Error("Invalid academic session format.");
    }

    const [startYear, endYear] = name.split("/").map(Number);

    return {
        startYear,
        endYear,
    };
};

const isSessionCurrent = (session) => {
    if (!session) {
        return false;
    }

    const now = new Date();

    return (
        now >= new Date(session.startDate) &&
        now <= new Date(session.endDate)
    );
};

module.exports = {
    validateSessionName,
    getSessionYears,
    isSessionCurrent,
};