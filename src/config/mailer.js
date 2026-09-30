const nodemailer = require("nodemailer");

let transporter = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASSWORD || "").trim();
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587,
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
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
  if (typeof to !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to.trim())) {
    throw new Error("A valid email recipient is required.");
  }

  const activeTransporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";

  if (!activeTransporter) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD in the server environment.");
  }

  try {
    const info = await activeTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[SMTP SUCCESS] Message accepted | Subject: "${subject}" | MessageID: ${info.messageId} | Response: ${info.response}`);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      acceptedCount: info.accepted?.length || 0,
      rejectedCount: info.rejected?.length || 0,
    };
  } catch (error) {
    console.error(`[SMTP FAILED] Message rejected | Subject: "${subject}" | Code: ${error.code || "UNKNOWN"} | Error: ${error.message}`);
    throw error;
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
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #B02032;">Registration Number: ${escapeHtml(registrationNumber || 'N/A')}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">Congratulations! 🎉 We are pleased to inform you that your application for admission to <strong>Mercy T College Nursery and Primary School</strong> has been approved by the School Admissions Board.</p>
      
      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #041664;">Admission Summary:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
          <li><strong>Student Name:</strong> ${escapeHtml(name)}</li>
          <li><strong>Registration Number:</strong> <code style="background:#041664; color:#ffffff; padding:2px 8px; border-radius:4px; font-weight:bold;">${escapeHtml(registrationNumber)}</code></li>
          <li><strong>Class / Level:</strong> ${escapeHtml(classText)}</li>
          <li><strong>Academic Session:</strong> ${escapeHtml(sessionText)}</li>
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

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
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
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #B02032;">Staff ID: ${escapeHtml(staffId || 'N/A')}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">On behalf of the Management of <strong>Mercy T College Nursery and Primary School</strong>, we are pleased to confirm that your staff appointment has been approved.</p>

      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #041664;">Staff Profile Details:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
          <li><strong>Staff Name:</strong> ${escapeHtml(name)}</li>
          <li><strong>Staff ID:</strong> <code style="background:#041664; color:#ffffff; padding:2px 8px; border-radius:4px; font-weight:bold;">${escapeHtml(staffId)}</code></li>
          <li><strong>Assigned Role:</strong> ${escapeHtml(roleText)}</li>
          <li><strong>Department:</strong> ${escapeHtml(deptText)}</li>
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

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
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
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = "Reset your Mercy T College password";
  const text = `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const html = `<p>Use the link below to reset your password for <strong>Mercy T College Nursery and Primary School</strong>:</p><p><a href="${safeResetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`;
  return sendEmail({ to, subject, html, text });
};

/**
 * Role Assignment Email Template
 */
const sendRoleAssignmentEmail = async ({ to, name, roles, activationUrl }) => {
  const roleList = Array.isArray(roles) ? roles.join(", ") : roles;
  const safeRoleList = escapeHtml(roleList);
  const safeName = escapeHtml(name);
  const safeActivationUrl = escapeHtml(activationUrl);
  const subject = "OFFICIAL ROLE ASSIGNMENT NOTICE — Mercy T College";
  const text = `Dear ${name},\n\nYou have been assigned the following role(s) at Mercy T College: ${roleList}.\n\nThis assignment requires activation before your workspace permissions take effect.\n\nPlease click the link below to activate your role(s):\n${activationUrl}\n\nIf you did not expect this assignment, please contact School Administration immediately.\n\nBest regards,\nHuman Resources & System Administration\nMercy T College`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #D8D2C6; border-radius: 4px; background-color: #FAF7F2; color: #111111;">
      <div style="text-align: center; border-bottom: 3px solid #0A192F; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #0A192F; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">MERCY T COLLEGE</h1>
        <p style="margin: 4px 0 0 0; color: #666666; font-size: 13px; font-style: italic;">Knowledge is Light</p>
      </div>

      <div style="background: #ffffff; border-left: 4px solid #0A192F; padding: 14px 18px; margin-bottom: 24px; border-radius: 4px; border: 1px solid #D8D2C6;">
        <h2 style="margin: 0; font-size: 16px; color: #0A192F;">Notice of Staff Role Assignment</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #991B1B; font-weight: bold;">Status: PENDING ACTIVATION</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${safeName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">You have been assigned the following system role(s) by the Administrator:</p>

      <div style="background: #F3EEE7; padding: 16px; border-radius: 4px; margin: 20px 0; border: 1px solid #D8D2C6;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #0A192F;">Assigned Role(s):</h3>
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0A192F;">${safeRoleList}</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6;">To finalize your role activation and open your authorized module permissions, please click the button below:</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${safeActivationUrl}" style="background-color: #0A192F; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 4px; display: inline-block;">Activate Assigned Role(s)</a>
      </div>

      <p style="font-size: 12px; color: #666666; margin-top: 20px;">Or copy and paste this link into your browser:<br/><a href="${safeActivationUrl}" style="color: #0A192F;">${safeActivationUrl}</a></p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #D8D2C6; font-size: 13px; color: #666666;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold; color: #0A192F;">Office of System Administration & Human Resources</p>
        <p style="margin: 2px 0 0 0;">Mercy T College</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Transporter Connection Verifier
 */
const verifyTransporter = async () => {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    return { verified: false, reason: "NO_SMTP_CREDENTIALS", message: "SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing in environment." };
  }
  try {
    await activeTransporter.verify();
    console.log("[SMTP VERIFY SUCCESS] SMTP Transporter connection verified.");
    return { verified: true, message: "SMTP Transporter connection verified successfully." };
  } catch (err) {
    console.error(`[SMTP VERIFY FAILED] ${err.message}`);
    return { verified: false, reason: "VERIFICATION_FAILED", message: err.message };
  }
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
  verifyTransporter,
  studentAdmissionApproved,
  studentAdmissionRejected,
  teacherAccountApproved,
  teacherAccountRejected,
  sendPasswordResetEmail,
  sendRoleAssignmentEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};