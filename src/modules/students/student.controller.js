// Student controller
const studentService = require("./student.service");

const getMyProfile = async (req, res, next) => {
    try {
        const student =
            await studentService.getStudentByUserId(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            data: {
                student,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getByRegistrationNumber = async (
    req,
    res,
    next
) => {
    try {
        const student =
            await studentService
                .getStudentByRegistrationNumber(
                    req.params.registrationNumber
                );

        res.status(200).json({
            success: true,
            data: {
                student,
            },
        });
    } catch (error) {
        next(error);
    }
};

const createStudent = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await studentService.createStudent(req.body, req.user.schoolId) }); } catch (error) { next(error); } };
const getAllStudents = async (req, res, next) => { try { return res.json({ success: true, data: await studentService.getAllStudents() }); } catch (error) { next(error); } };
const getStudentById = async (req, res, next) => { try { return res.json({ success: true, data: await studentService.getStudentById(req.params.id) }); } catch (error) { next(error); } };
const updateStudent = async (req, res, next) => { try { return res.json({ success: true, data: await studentService.updateStudent(req.params.id, req.body) }); } catch (error) { next(error); } };

module.exports = {
    getMyProfile,
    getByRegistrationNumber,
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
};