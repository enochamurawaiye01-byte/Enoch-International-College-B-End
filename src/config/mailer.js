const nodemailer = require("nodemailer");

const getTransporter = () => {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Password reset email is not configured. Missing: ${missing.join(", ")}`);
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
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

module.exports = { sendPasswordResetEmail };