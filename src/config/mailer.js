const nodemailer = require("nodemailer");

const getTransporter = () => {
    const required = ["SMTP_USER", "SMTP_PASSWORD"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Gmail email is not configured. Missing: ${missing.join(", ")}`);
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
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
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subject = "Enoch International College application approved";
    const identity = registrationNumber ? `Your registration number is ${registrationNumber}.` : "Your application reference has been recorded by the college.";
    const text = `Dear ${name},\n\nWe are pleased to inform you that your ${role.toLowerCase()} application to Enoch International College has been approved. ${identity}\nYou may now sign in using this email address.\n\nYours faithfully,\nEnoch International College Admissions`;
    const info = await transporter.sendMail({ from, to, subject, text, html: `<p>Dear ${name},</p><p>We are pleased to inform you that your ${role.toLowerCase()} application to <strong>Enoch International College</strong> has been approved.</p><p><strong>${identity}</strong></p><p>You may now sign in using this email address.</p><p>Yours faithfully,<br>Enoch International College Admissions</p>` });
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