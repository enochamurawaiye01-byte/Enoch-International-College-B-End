const PAYMENT_ERRORS = {
	STUDENT_NOT_FOUND: "Student not found.",
	INVOICE_NOT_FOUND: "Invoice not found.",
	FEE_ACCOUNT_NOT_FOUND: "Fee account not found.",
	PAYMENT_NOT_FOUND: "Payment not found.",
	PAYMENT_REFERENCE_EXISTS: "Payment reference already exists.",
	PAYMENT_ALREADY_VERIFIED: "Payment has already been verified.",
	INVALID_PAYMENT_AMOUNT: "Payment amount exceeds the outstanding balance.",
	INVALID_PAYMENT_STATUS: "Payment status cannot be changed this way.",
};

module.exports = { PAYMENT_ERRORS };
