const nodemailer = require("nodemailer");

let transporter = null;

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASSWORD || "").trim();
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Generic Base Email Sender Function
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const activeTransporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";

  if (!activeTransporter) {
    console.info(`[SMTP SKIPPED] Email to <${to}> with subject "${subject}" was not sent because SMTP credentials (SMTP_USER/SMTP_PASSWORD) are not set in environment.`);
    return { success: false, skipped: true, reason: "NO_SMTP_CREDENTIALS" };
  }

  try {
    const info = await activeTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[SMTP SUCCESS] Email sent to <${to}> | Subject: "${subject}" | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP FAILED] Failed to send email to <${to}> | Subject: "${subject}" | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Student Admission Approved Template
 */
const studentAdmissionApproved = async ({ to, name, registrationNumber, classOrProgramme, academicSession }) => {
  const subject = "OFFICIAL ADMISSION & ACCEPTANCE NOTICE — Mercy T College";
  const sessionText = academicSession || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const classText = classOrProgramme || "Nursery / Primary Division";

  const text = `Dear ${name},\n\nCongratulations! 🎉\nWe are pleased to inform you that you have been admitted to Mercy T College Nursery and Primary School.\n\nAdmission Details:\nName: ${name}\nRegistration Number: ${registrationNumber || 'Pending'}\nClass/Programme: ${classText}\nAcademic Session: ${sessionText}\nAdmission Status: ADMITTED\n\nPlease keep your registration number safe as it will be used for your school records and future communication.\n\nCongratulations once again and welcome to Mercy T College.\n\nBest regards,\nAdmissions Office\nMercy T College`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
      <div style="text-align: center; border-bottom: 3px solid #041664; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #041664; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
        <p style="margin: 2px 0 0 0; color: #B02032; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-style: italic;">Knowledge is Light</p>
      </div>

      <div style="background: #ffffff; border-left: 4px solid #041664; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 6px 6px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
        <h2 style="margin: 0; font-size: 17px; color: #041664;">Official Notice of Admission</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #B02032;">Registration Number: ${registrationNumber || 'N/A'}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">Congratulations! 🎉 We are pleased to inform you that your application for admission to <strong>Mercy T College Nursery and Primary School</strong> has been approved by the School Admissions Board.</p>
      
      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #041664;">Admission Summary:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
          <li><strong>Student Name:</strong> ${name}</li>
          <li><strong>Registration Number:</strong> <code style="background:#041664; color:#ffffff; padding:2px 8px; border-radius:4px; font-weight:bold;">${registrationNumber}</code></li>
          <li><strong>Class / Level:</strong> ${classText}</li>
          <li><strong>Academic Session:</strong> ${sessionText}</li>
          <li><strong>Status:</strong> <span style="color:#10b981; font-weight:bold;">ADMITTED / APPROVED</span></li>
        </ul>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Please keep your registration number safe as it will serve as your primary academic identifier for logins, class registers, report cards, and fee settlements.</p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold; color: #041664;">Office of the Registrar & Admissions Board</p>
        <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Student Admission Rejected Template
 */
const studentAdmissionRejected = async ({ to, name }) => {
  const subject = "APPLICATION UPDATE — Mercy T College Nursery and Primary School";
  const text = `Dear ${name},\n\nThank you for your interest in Mercy T College Nursery and Primary School. After careful review, we regret to inform you that your application could not be approved at this time.\n\nWe wish you success in your future academic pursuits.\n\nYours faithfully,\nAdmissions Board\nMercy T College`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
      <div style="text-align: center; border-bottom: 3px solid #B02032; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #041664; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
        <p style="margin: 2px 0 0 0; color: #B02032; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for applying for admission to <strong>Mercy T College Nursery and Primary School</strong>.</p>
      <p style="font-size: 15px; line-height: 1.6;">After careful review of your application by the Admissions Board, we regret to inform you that we are unable to grant approval for admission at this time due to class capacity limitations.</p>
      <p style="font-size: 15px; line-height: 1.6;">We appreciate your effort and wish you success in your academic endeavors.</p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold; color: #041664;">Admissions Board</p>
        <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Teacher/Staff Account Approved Template
 */
const teacherAccountApproved = async ({ to, name, staffId, department, role }) => {
  const subject = "Welcome to Mercy T College — Staff Account Approved";
  const roleText = role || "Teaching Staff";
  const deptText = department || "Academic Faculty";

  const text = `Dear ${name},\n\nYour staff account at Mercy T College Nursery and Primary School has been successfully approved.\n\nStaff Details:\nName: ${name}\nStaff ID: ${staffId || 'Pending'}\nDepartment: ${deptText}\nRole: ${roleText}\n\nYour staff workspace is now active. You may log in using your registered email address.\n\nBest regards,\nAdministration\nMercy T College`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
      <div style="text-align: center; border-bottom: 3px solid #041664; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #041664; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
        <p style="margin: 2px 0 0 0; color: #B02032; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-style: italic;">Knowledge is Light</p>
      </div>

      <div style="background: #ffffff; border-left: 4px solid #041664; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 6px 6px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
        <h2 style="margin: 0; font-size: 17px; color: #041664;">Official Letter of Appointment</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #B02032;">Staff ID: ${staffId || 'N/A'}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">On behalf of the Management of <strong>Mercy T College Nursery and Primary School</strong>, we are pleased to confirm that your staff appointment has been approved.</p>

      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #041664;">Staff Profile Details:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
          <li><strong>Staff Name:</strong> ${name}</li>
          <li><strong>Staff ID:</strong> <code style="background:#041664; color:#ffffff; padding:2px 8px; border-radius:4px; font-weight:bold;">${staffId}</code></li>
          <li><strong>Assigned Role:</strong> ${roleText}</li>
          <li><strong>Department:</strong> ${deptText}</li>
          <li><strong>Status:</strong> <span style="color:#10b981; font-weight:bold;">ACTIVE</span></li>
        </ul>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Your staff workspace is active. Please sign in to your staff portal using your registered email address to access your assigned classes, subjects, timetables, and report cards.</p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold; color: #041664;">Office of Human Resources & Administration</p>
        <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Teacher/Staff Account Rejected Template
 */
const teacherAccountRejected = async ({ to, name }) => {
  const subject = "STAFF APPLICATION UPDATE — Mercy T College Nursery and Primary School";
  const text = `Dear ${name},\n\nThank you for your application to join the staff of Mercy T College Nursery and Primary School. After careful review, we regret to inform you that we cannot proceed with your staff appointment at this time.\n\nWe wish you the best in your career.\n\nYours faithfully,\nHuman Resources\nMercy T College`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fdfbf7; color: #1b2a4a;">
      <div style="text-align: center; border-bottom: 3px solid #B02032; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #041664; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
        <p style="margin: 2px 0 0 0; color: #B02032; font-size: 14px; font-weight: bold;">NURSERY AND PRIMARY SCHOOL</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for your interest in employment with <strong>Mercy T College Nursery and Primary School</strong>.</p>
      <p style="font-size: 15px; line-height: 1.6;">After reviewing your staff application, we regret to inform you that we are unable to approve your application at this time.</p>
      <p style="font-size: 15px; line-height: 1.6;">We appreciate your effort and wish you professional success.</p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold; color: #041664;">Office of Human Resources & Administration</p>
        <p style="margin: 2px 0 0 0;">Mercy T College Nursery and Primary School</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Password Reset Template
 */
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const subject = "Reset your Mercy T College password";
  const text = `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const html = `<p>Use the link below to reset your password for <strong>Mercy T College Nursery and Primary School</strong>:</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`;
  return sendEmail({ to, subject, html, text });
};

/**
 * Wrappers for Backward Compatibility
 */
const sendApprovalEmail = async ({ to, name, role, registrationNumber, classOrProgramme, academicSession, department }) => {
  const isStudent = (role || "").toUpperCase() === "STUDENT";
  if (isStudent) {
    return studentAdmissionApproved({ to, name, registrationNumber, classOrProgramme, academicSession });
  } else {
    return teacherAccountApproved({ to, name, staffId: registrationNumber, role, department });
  }
};

const sendRejectionEmail = async ({ to, name, role }) => {
  const isStudent = (role || "").toUpperCase() === "STUDENT";
  if (isStudent) {
    return studentAdmissionRejected({ to, name });
  } else {
    return teacherAccountRejected({ to, name });
  }
};

module.exports = {
  sendEmail,
  studentAdmissionApproved,
  studentAdmissionRejected,
  teacherAccountApproved,
  teacherAccountRejected,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};