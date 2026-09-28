const nodemailer = require("nodemailer");

const getTransporter = () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        console.info("[Mailer Info] SMTP_USER or SMTP_PASSWORD not set in environment. Falling back to log dispatch.");
        return {
            sendMail: async (options) => {
                console.log(`[Approval/Rejection Email Dispatched to ${options.to}] Subject: ${options.subject}`);
                return { messageId: `log-dispatched-${Date.now()}` };
            }
        };
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        auth: { user, pass },
    });
};

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";

    await transporter.sendMail({
        from,
        to,
        subject: "Reset your Mercy T College password",
        text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Use the link below to reset your password for <strong>Mercy T College Nursery and Primary School</strong>:</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
    });
};

const sendApprovalEmail = async ({ to, name, role, registrationNumber }) => {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";
    const isStudent = (role || "").toUpperCase() === "STUDENT";
    
    const subject = isStudent
        ? "OFFICIAL ADMISSION & ACCEPTANCE NOTICE — Mercy T College Nursery and Primary School"
        : "OFFICIAL LETTER OF APPOINTMENT & EMPLOYMENT — Mercy T College Nursery and Primary School";

    const refLabel = isStudent ? "Student Registration Number" : "Staff Identification Number";
    const titleText = isStudent ? "Official Notice of Admission" : "Official Letter of Appointment";

    const textBody = isStudent
        ? `Dear ${name},\n\nWe are pleased to inform you that your application for admission to Mercy T College Nursery and Primary School has been approved by the School Admissions Board.\n\nYour official ${refLabel} is: ${registrationNumber || 'Pending'}.\n\nYou may now log in to the student portal using your registered email address.\n\nYours faithfully,\nOffice of the Registrar & Admissions Board\nMercy T College Nursery and Primary School`
        : `Dear ${name},\n\nOn behalf of the Management of Mercy T College Nursery and Primary School, we are pleased to confirm your appointment as a member of our teaching faculty / staff.\n\nYour official ${refLabel} is: ${registrationNumber || 'Pending'}.\n\nYou may now log in to the staff portal using your registered email address.\n\nYours faithfully,\nOffice of Human Resources & Administration\nMercy T College Nursery and Primary School`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
            <div style="text-align: center; border-bottom: 3px solid #1b2a4a; padding-bottom: 16px; margin-bottom: 24px;">
                <h1 style="margin: 0; color: #1b2a4a; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
                <p style="margin: 2px 0 0 0; color: #c53030; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-style: italic;">Knowledge is Light</p>
            </div>
            
            <div style="background: #ffffff; border-left: 4px solid #1b2a4a; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                <h2 style="margin: 0; font-size: 16px; color: #1b2a4a;">${titleText}</h2>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #c53030;">${refLabel}: ${registrationNumber || 'N/A'}</p>
            </div>

            <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>

            ${isStudent ? `
                <p style="font-size: 15px; line-height: 1.6;">We are delighted to inform you that your application for admission to <strong>Mercy T College Nursery and Primary School</strong> has been formally approved by the Admissions Board.</p>
                <p style="font-size: 15px; line-height: 1.6;">Your official Student Registration Number is <strong><code style="background:#1b2a4a; color:#ffffff; padding: 4px 8px; border-radius: 4px; font-size: 15px;">${registrationNumber}</code></strong>. Please retain this number as your primary academic identifier for session enrollments, class registers, report cards, and fee records.</p>
                <p style="font-size: 15px; line-height: 1.6;">You may now access your student workspace portal using your registered email address.</p>
            ` : `
                <p style="font-size: 15px; line-height: 1.6;">On behalf of the Management of <strong>Mercy T College Nursery and Primary School</strong>, we are pleased to confirm your appointment as a member of our teaching faculty / staff.</p>
                <p style="font-size: 15px; line-height: 1.6;">Your official Staff Identification Number is <strong><code style="background:#1b2a4a; color:#ffffff; padding: 4px 8px; border-radius: 4px; font-size: 15px;">${registrationNumber}</code></strong>. Your staff workspace has been activated with access to your class registers, subjects, timetables, and report cards.</p>
                <p style="font-size: 15px; line-height: 1.6;">Please sign in to your staff portal using your registered email address to view your assigned classes and subjects.</p>
            `}

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
                <p style="margin: 0;">Yours faithfully,</p>
                <p style="margin: 4px 0 0 0; font-weight: bold; color: #1b2a4a;">${isStudent ? "Office of the Registrar & Admissions Board" : "Office of Human Resources & Administration"}</p>
                <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
            </div>
        </div>
    `;

    const info = await transporter.sendMail({ from, to, subject, text: textBody, html: htmlBody });
    return { messageId: info.messageId };
};

const sendRejectionEmail = async ({ to, name }) => {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";
    const subject = "APPLICATION UPDATE — Mercy T College Nursery and Primary School";

    const textBody = `Dear ${name},\n\nThank you for your interest in Mercy T College Nursery and Primary School. After careful review, we regret to inform you that your application could not be approved at this time.\n\nWe wish you the very best in your academic pursuits.\n\nYours faithfully,\nAdmissions Office\nMercy T College Nursery and Primary School`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
            <div style="text-align: center; border-bottom: 3px solid #c53030; padding-bottom: 16px; margin-bottom: 24px;">
                <h1 style="margin: 0; color: #1b2a4a; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
                <p style="margin: 2px 0 0 0; color: #c53030; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
            </div>

            <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6;">Thank you for your interest in <strong>Mercy T College Nursery and Primary School</strong>.</p>
            <p style="font-size: 15px; line-height: 1.6;">After careful review of your application by the Admissions Board, we regret to inform you that we are unable to grant approval for admission at this time due to limited capacity.</p>
            <p style="font-size: 15px; line-height: 1.6;">We appreciate your effort and wish you success in your future endeavors.</p>

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
                <p style="margin: 0;">Yours faithfully,</p>
                <p style="margin: 4px 0 0 0; font-weight: bold; color: #1b2a4a;">Admissions Board</p>
                <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
            </div>
        </div>
    `;

    const info = await transporter.sendMail({ from, to, subject, text: textBody, html: htmlBody });
    return { messageId: info.messageId };
};

const sendApprovalSms = async ({ to, name, role, registrationNumber }) => {
    throw new Error("SMS delivery is disabled.");
};

module.exports = { sendPasswordResetEmail, sendApprovalEmail, sendRejectionEmail, sendApprovalSms };