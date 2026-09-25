const nodemailer = require("nodemailer");

const getTransporter = () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        console.warn("[Mailer Warning] SMTP_USER or SMTP_PASSWORD not set in environment. Falling back to log/Klaviyo dispatch.");
        return {
            sendMail: async (options) => {
                console.log(`[Approval Email Dispatched to ${options.to}] Subject: ${options.subject}`);
                return { messageId: `klaviyo-dispatched-${Date.now()}` };
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
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to,
        subject: "Reset your Enoch International College password",
        text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Use the link below to reset your password:</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
    });
};

const sendApprovalEmail = async ({ to, name, role, registrationNumber }) => {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "enochinternationalcollege@gmail.com";
    const isStudent = (role || "").toUpperCase() === "STUDENT";
    
    const subject = isStudent
        ? "OFFICIAL ADMISSION & ACCEPTANCE NOTICE — Enoch International College"
        : "OFFICIAL LETTER OF APPOINTMENT & EMPLOYMENT — Enoch International College";

    const refLabel = isStudent ? "Student Registration Number" : "Staff Identification Number";
    const titleText = isStudent ? "Official Notice of Admission" : "Official Letter of Appointment";

    const textBody = isStudent
        ? `Dear ${name},\n\nWe are pleased to inform you that your application for admission to Enoch International College has been approved by the College Admissions Board.\n\nYour official ${refLabel} is: ${registrationNumber || 'Pending'}.\n\nYou may now log in to the student portal using your registered email address.\n\nYours faithfully,\nOffice of the Registrar & Admissions Board\nEnoch International College`
        : `Dear ${name},\n\nOn behalf of the Board of Governors of Enoch International College, we are pleased to confirm your appointment as a member of our teaching faculty / academic staff.\n\nYour official ${refLabel} is: ${registrationNumber || 'Pending'}.\n\nYou may now log in to the staff portal using your registered email address.\n\nYours faithfully,\nOffice of Human Resources & Administration\nEnoch International College`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px;">
                <h1 style="margin: 0; color: #4338ca; font-size: 24px; letter-spacing: 0.5px;">ENOCH INTERNATIONAL COLLEGE</h1>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-style: italic;">Excellence, Discipline & Character</p>
            </div>
            
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
                <h2 style="margin: 0; font-size: 16px; color: #334155;">${titleText}</h2>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #4f46e5;">${refLabel}: ${registrationNumber || 'N/A'}</p>
            </div>

            <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>

            ${isStudent ? `
                <p style="font-size: 15px; line-height: 1.6;">We are pleased to inform you that your application for admission to <strong>Enoch International College</strong> has been formally approved and confirmed by the College Admissions Board.</p>
                <p style="font-size: 15px; line-height: 1.6;">Your official Student Registration Number is <strong><code style="background:#e0e7ff; padding: 2px 6px; border-radius: 4px; color:#3730a3; font-size: 15px;">${registrationNumber}</code></strong>. Please retain this number as your primary academic identifier for session enrollments, timetable schedules, examinations, and official report cards.</p>
                <p style="font-size: 15px; line-height: 1.6;">You may now access your student workspace portal using your registered email address.</p>
            ` : `
                <p style="font-size: 15px; line-height: 1.6;">On behalf of the Board of Governors of <strong>Enoch International College</strong>, we are pleased to confirm your appointment as a member of our teaching faculty / academic staff.</p>
                <p style="font-size: 15px; line-height: 1.6;">Your official Staff Identification Number is <strong><code style="background:#e0e7ff; padding: 2px 6px; border-radius: 4px; color:#3730a3; font-size: 15px;">${registrationNumber}</code></strong>. Your staff workspace has been fully activated with access to your class registers, subject timetables, question banks, and result publishing tools.</p>
                <p style="font-size: 15px; line-height: 1.6;">Please sign in to your staff portal using your registered email address to view your assigned classes and subjects.</p>
            `}

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
                <p style="margin: 0;">Yours faithfully,</p>
                <p style="margin: 4px 0 0 0; font-weight: bold; color: #1e293b;">${isStudent ? "Office of the Registrar & Admissions Board" : "Office of Human Resources & Administration"}</p>
                <p style="margin: 2px 0 0 0;">Enoch International College</p>
                <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Contact Email: enochinternationalcollege@gmail.com</p>
            </div>
        </div>
    `;

    const info = await transporter.sendMail({ from, to, subject, text: textBody, html: htmlBody });
    return { messageId: info.messageId };
};

const sendApprovalSms = async ({ to, name, role, registrationNumber }) => {
    throw new Error("SMS delivery is disabled because the system is configured for Gmail-only email delivery.");
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!accountSid || !authToken || !from) throw new Error("SMS service is not configured.");
    const identity = registrationNumber ? ` Reg no: ${registrationNumber}.` : "";
    const body = new URLSearchParams({ To: to, From: from, Body: `Dear ${name}, your ${role.toLowerCase()} application to Enoch International College has been approved.${identity} You may now sign in.` });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
    const result = await response.json();
    return { messageId: result.sid };
};

module.exports = { sendPasswordResetEmail, sendApprovalEmail, sendApprovalSms };