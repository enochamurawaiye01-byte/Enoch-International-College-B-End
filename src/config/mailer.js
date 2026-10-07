const nodemailer = require("nodemailer");
const dns = require("node:dns").promises;
const net = require("node:net");
const klaviyoService = require("../modules/klaviyo/klaviyo.service");

let transporter = null;

const resolveIPv4 = async (host) => {
  let resolveError;
  try {
    const addresses = await dns.resolve4(host);
    if (addresses.length) return addresses;
  } catch (error) {
    resolveError = error;
  }
  try {
    const addresses = await dns.lookup(host, { family: 4, all: true });
    if (addresses.length) return addresses.map(({ address }) => address);
  } catch (error) {
    if (resolveError) {
      error.message = `IPv4 DNS lookup failed (${resolveError.message}; ${error.message})`;
    }
    throw error;
  }
  throw resolveError || new Error(`No IPv4 addresses found for SMTP host ${host}.`);
};

const connectOverIPv4 = (options, callback) => {
  resolveIPv4(options.host).then((addresses) => {
    let nextAddress = 0;
    let lastError;
    const deadline = Date.now() + (options.connectionTimeout || 15000);
    const tryNextAddress = () => {
      if (nextAddress >= addresses.length) {
        callback(lastError || new Error(`No IPv4 addresses found for SMTP host ${options.host}.`));
        return;
      }
      const socket = net.connect({
        host: addresses[nextAddress++],
        port: options.port,
        family: 4,
      });
      const timeout = setTimeout(() => {
        const error = new Error("Connection timeout");
        error.code = "ETIMEDOUT";
        socket.destroy(error);
      }, Math.max(1, deadline - Date.now()));
      const onError = (error) => {
        clearTimeout(timeout);
        socket.removeListener("connect", onConnect);
        lastError = error;
        tryNextAddress();
      };
      const onConnect = () => {
        clearTimeout(timeout);
        socket.removeListener("error", onError);
        callback(null, { connection: socket });
      };
      socket.once("error", onError);
      socket.once("connect", onConnect);
    };
    if (!addresses.length) {
      callback(new Error(`No IPv4 addresses found for SMTP host ${options.host}.`));
      return;
    }
    tryNextAddress();
  }).catch(callback);
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const formatRoleLabel = (value) => String(value || "").toLowerCase().split("_")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

const emailFrame = (title, content) => `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#FFFEF5;color:#17191C;border:1px solid #D6D8BC;">
    <header style="padding-bottom:16px;margin-bottom:24px;border-bottom:3px solid #13283E;">
      <h1 style="margin:0;color:#13283E;font-size:22px;">Mercy T College</h1>
      <p style="margin:4px 0 0;color:#A33B45;font-size:13px;font-weight:700;">Nursery and Primary School</p>
      <p style="margin:4px 0 0;color:#555;font-size:12px;">Knowledge is Light</p>
    </header>
    <h2 style="margin:0 0 16px;color:#13283E;font-size:18px;">${escapeHtml(title)}</h2>
    ${content}
    <footer style="margin-top:28px;padding-top:16px;border-top:1px solid #D6D8BC;color:#555;font-size:13px;line-height:1.6;">
      <p style="margin:0;">Regards,</p>
      <strong style="color:#13283E;">Mercy T College Administration</strong>
    </footer>
  </div>
`;

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASSWORD || "").trim();
  const secureSetting = (process.env.SMTP_SECURE || "").trim().toLowerCase();
  if (secureSetting && !["true", "false"].includes(secureSetting)) {
    throw new Error("SMTP_SECURE must be set to true or false.");
  }
  const secure = secureSetting ? secureSetting === "true" : port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: { user, pass },
    getSocket: connectOverIPv4,
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

  const from = process.env.SMTP_MAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "mercytcollege@gmail.com";
  const activeTransporter = getTransporter();
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
    const recipientAccepted = (info.accepted || []).some(
      (recipient) => String(recipient).toLowerCase() === to.trim().toLowerCase()
    );
    if (!recipientAccepted) {
      const error = new Error("SMTP server did not accept the email recipient.");
      error.code = "SMTP_RECIPIENT_REJECTED";
      throw error;
    }
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
const studentApplicationApproved = async ({ to, name, username, applicationNumber }) => {
  const subject = "Admission application approved | Mercy T College";
  const loginName = username || to;
  const text = `Dear ${name},\n\nWe are pleased to inform you that your application to Mercy T College Nursery and Primary School has been approved.\n\nApplication reference: ${applicationNumber || "Not available"}\nAccount username: ${loginName || "Not available"}\n\nYour student profile and official registration number will be issued when enrollment is completed. Please keep this application reference for your records.\n\nRegards,\nMercy T College Admissions Office`;
  const html = emailFrame("Admission application approved", `
    <p style="font-size:15px;line-height:1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;">We are pleased to inform you that your application to Mercy T College Nursery and Primary School has been approved.</p>
    <div style="padding:16px;background:#F1F2D6;border-left:4px solid #13283E;line-height:1.8;">
      <p style="margin:0;"><strong>Application reference:</strong> ${escapeHtml(applicationNumber || "Not available")}</p>
      <p style="margin:0;"><strong>Account username:</strong> ${escapeHtml(loginName || "Not available")}</p>
      <p style="margin:0;"><strong>Decision:</strong> Approved</p>
    </div>
    <p style="font-size:14px;line-height:1.7;">Your student profile and official registration number will be issued when enrollment is completed. Please keep this application reference for your records.</p>
  `);
  return sendEmail({ to, subject, html, text });
};

const studentAdmissionApproved = async ({ to, name, username, applicationNumber, registrationNumber, classOrProgramme, academicSession }) => {
  const subject = "Congratulations on your admission | Mercy T College";
  const loginName = username || to;
  const classText = classOrProgramme || "To be confirmed by the school";
  const sessionText = academicSession || "Current academic session";
  const text = `Dear ${name},\n\nCongratulations! We are pleased to confirm your admission to Mercy T College Nursery and Primary School.\n\nStudent name: ${name}\nApplication reference: ${applicationNumber || "Not available"}\nRegistration number: ${registrationNumber || "Not available"}\nAccount username: ${loginName || "Not available"}\nClass / level: ${classText}\nAcademic session: ${sessionText}\n\nKeep your registration number for school records and future communication. Use your registered email address as your account username. For account access assistance, contact the school administration.\n\nRegards,\nMercy T College Admissions Office`;
  const html = emailFrame("Student enrollment confirmed", `
    <p style="font-size:15px;line-height:1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;">Congratulations! We are pleased to confirm your admission to Mercy T College Nursery and Primary School. Please retain these details for your school records.</p>
    <div style="padding:16px;background:#F1F2D6;border-left:4px solid #A33B45;line-height:1.9;">
      <p style="margin:0;"><strong>Student name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0;"><strong>Application reference:</strong> ${escapeHtml(applicationNumber || "Not available")}</p>
      <p style="margin:0;"><strong>Registration number:</strong> <strong style="color:#13283E;">${escapeHtml(registrationNumber || "Not available")}</strong></p>
      <p style="margin:0;"><strong>Account username:</strong> ${escapeHtml(loginName || "Not available")}</p>
      <p style="margin:0;"><strong>Class / level:</strong> ${escapeHtml(classText)}</p>
      <p style="margin:0;"><strong>Academic session:</strong> ${escapeHtml(sessionText)}</p>
    </div>
    <p style="font-size:14px;line-height:1.7;">Keep your registration number for school records and future communication. Use your registered email address as your account username. For account access assistance, contact the school administration.</p>
  `);
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
const teacherAccountApproved = async ({ to, name, username, staffId, department, role }) => {
  const subject = "Employment appointment letter | Mercy T College";
  const loginName = username || to;
  const roleText = formatRoleLabel(role || "TEACHER");
  const deptText = department || "To be confirmed by the school";
  const text = `Dear ${name},\n\nEMPLOYMENT APPOINTMENT LETTER\n\nMercy T College is pleased to offer and confirm your appointment at the school. We congratulate you on your successful application and welcome you to the team.\n\nStaff name: ${name}\nStaff ID: ${staffId || "Not assigned"}\nAccount username: ${loginName || "Not available"}\nPosition: ${roleText}\nDepartment: ${deptText}\nAppointment status: Active\n\nPlease contact Human Resources for your reporting date, onboarding requirements, and any employment terms not included in this appointment notice. Use your registered email address as your account username.\n\nYours sincerely,\nHuman Resources\nMercy T College`;
  const html = emailFrame("Staff appointment confirmed", `
    <p style="font-size:15px;line-height:1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;"><strong>EMPLOYMENT APPOINTMENT LETTER</strong></p>
    <p style="font-size:14px;line-height:1.7;">Mercy T College is pleased to offer and confirm your appointment at the school. We congratulate you on your successful application and welcome you to the team.</p>
    <div style="padding:16px;background:#F1F2D6;border-left:4px solid #13283E;line-height:1.9;">
      <p style="margin:0;"><strong>Staff name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0;"><strong>Staff ID:</strong> <strong style="color:#13283E;">${escapeHtml(staffId || "Not assigned")}</strong></p>
      <p style="margin:0;"><strong>Account username:</strong> ${escapeHtml(loginName || "Not available")}</p>
      <p style="margin:0;"><strong>Position:</strong> ${escapeHtml(roleText)}</p>
      <p style="margin:0;"><strong>Department:</strong> ${escapeHtml(deptText)}</p>
      <p style="margin:0;"><strong>Appointment status:</strong> Active</p>
    </div>
    <p style="font-size:14px;line-height:1.7;">Please contact Human Resources for your reporting date, onboarding requirements, and any employment terms not included in this appointment notice. Use your registered email address as your account username.</p>
  `);
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
const sendRoleAssignmentEmail = async ({ to, name, username, staffId, roles, activationUrl }) => {
  const roleList = (Array.isArray(roles) ? roles : [roles]).filter(Boolean).map(formatRoleLabel).join(", ");
  const safeRoleList = escapeHtml(roleList);
  const safeName = escapeHtml(name);
  const safeActivationUrl = escapeHtml(activationUrl);
  const safeUsername = escapeHtml(username || "Not available");
  const safeStaffId = escapeHtml(staffId || "Not assigned");
  const subject = "Role assignment requires activation | Mercy T College";
  const text = `Dear ${name},\n\nThe school administration has assigned the following role(s) to your account: ${roleList}.\n\nAccount details:\nName: ${name}\nUsername: ${username || "Not available"}\nStaff ID: ${staffId || "Not assigned"}\nRole status: Pending activation\n\nActivate the assigned role(s) using the secure link below. Your new permissions will take effect after activation.\n${activationUrl}\n\nIf you were not expecting this change, contact the school administration.\n\nRegards,\nHuman Resources and System Administration\nMercy T College`;
  const html = emailFrame("Role assignment requires activation", `
    <p style="font-size:15px;line-height:1.6;">Dear <strong>${safeName}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;">The school administration has assigned the following role(s) to your account. Access will be enabled after you activate the assignment.</p>
    <div style="padding:16px;background:#F1F2D6;border-left:4px solid #A33B45;line-height:1.9;">
      <p style="margin:0;"><strong>Account username:</strong> ${safeUsername}</p>
      <p style="margin:0;"><strong>Staff ID:</strong> ${safeStaffId}</p>
      <p style="margin:0;"><strong>Assigned role(s):</strong> <strong style="color:#13283E;">${safeRoleList}</strong></p>
      <p style="margin:0;"><strong>Status:</strong> Pending activation</p>
    </div>
    <p style="font-size:14px;line-height:1.7;">Use the secure link below to activate your role assignment:</p>
    <p style="margin:20px 0;"><a href="${safeActivationUrl}" style="display:inline-block;padding:12px 18px;background:#13283E;color:#fff;text-decoration:none;font-weight:700;">Review and activate role</a></p>
    <p style="font-size:12px;line-height:1.6;color:#555;">If the button does not work, open this link:<br><a href="${safeActivationUrl}" style="color:#13283E;">${safeActivationUrl}</a></p>
    <p style="font-size:13px;line-height:1.6;">If you were not expecting this change, contact the school administration.</p>
  `);

  return sendEmail({ to, subject, html, text });
};

const sendRoleActivatedEmail = async ({ to, name, username, staffId, role }) => {
  const roleLabel = formatRoleLabel(role);
  const loginName = username || to;
  const subject = `Role activated: ${roleLabel} | Mercy T College`;
  const text = `Dear ${name},\n\nYour ${roleLabel} role at Mercy T College Nursery and Primary School has been activated. Your assigned permissions are now available in your workspace.\n\nName: ${name}\nUsername: ${loginName || "Not available"}\nStaff ID: ${staffId || "Not assigned"}\nActive role: ${roleLabel}\n\nSign in with your registered email address to access your authorized workspace. If this activation was unexpected, contact the school administration.\n\nRegards,\nHuman Resources and System Administration\nMercy T College`;
  const html = emailFrame("Role activation confirmed", `
    <p style="font-size:15px;line-height:1.6;">Dear <strong>${escapeHtml(name)}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;">Your assigned role has been activated. The permissions for this role are now available in your workspace.</p>
    <div style="padding:16px;background:#F1F2D6;border-left:4px solid #13283E;line-height:1.9;">
      <p style="margin:0;"><strong>Account username:</strong> ${escapeHtml(loginName || "Not available")}</p>
      <p style="margin:0;"><strong>Staff ID:</strong> ${escapeHtml(staffId || "Not assigned")}</p>
      <p style="margin:0;"><strong>Active role:</strong> <strong style="color:#13283E;">${escapeHtml(roleLabel)}</strong></p>
      <p style="margin:0;"><strong>Status:</strong> Active</p>
    </div>
    <p style="font-size:14px;line-height:1.7;">Sign in with your registered email address to access your authorized workspace. If this activation was unexpected, contact the school administration.</p>
  `);
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
const sendApprovalEmail = async ({ to, name, username, applicationNumber, role, registrationNumber, classOrProgramme, academicSession, department }) => {
  return klaviyoService.trackApprovalEvent({
    email: to,
    name,
    username,
    applicationNumber,
    role,
    registrationNumber,
    classOrProgramme,
    academicSession,
    department,
  });
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
  sendRoleActivatedEmail,
  studentApplicationApproved,
  sendApprovalEmail,
  sendRejectionEmail,
};