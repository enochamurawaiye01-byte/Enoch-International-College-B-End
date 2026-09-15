const MODULE_ACCESS_ERRORS = {
    INVALID_MODULE: "Module name is invalid.",
    MODULE_DISABLED: "This module is currently disabled.",
    OUTSIDE_TIME_WINDOW: "This module is not available at this time.",
    PAYMENT_REQUIRED: "Outstanding fees restrict access to this module.",
};

const MODULE_KEYS = [
    "admissions", "students", "parents", "enrollments", "promotions", "staff", "teachers",
    "roles", "permissions", "fees", "invoices", "payments", "receipts", "reports", "library", "inventory",
    "transport", "hostel", "medical", "discipline", "attendance", "teacher-attendance", "timetable", "lessons",
    "assignments", "assessments", "examinations", "cbt", "results", "report-cards", "transcripts",
    "announcements", "notifications", "messaging", "documents", "news", "events", "gallery", "website",
    "analytics", "audit-logs", "management", "academic-sessions", "terms", "classes", "subjects", "departments",
    "class-subjects", "teacher-assignments", "question-bank", "exam-attempts", "settings",
];

module.exports = { MODULE_ACCESS_ERRORS, MODULE_KEYS };