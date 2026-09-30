require("dotenv").config();
const { verifyTransporter, sendEmail } = require("../src/config/mailer");

async function runMailerDiagnostic() {
  console.log("=== STARTING MAILER SMTP DIAGNOSTIC TEST ===");
  console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT || 587}`);
  console.log(`SMTP user configured: ${Boolean(process.env.SMTP_USER)}`);
  console.log(`SMTP from configured: ${Boolean(process.env.SMTP_FROM || process.env.SMTP_USER)}`);

  const verification = await verifyTransporter();
  console.log("Verification Result:", verification);

  if (!verification.verified) {
    console.warn("SMTP Verification failed or skipped. Check your environment variables.");
    return;
  }

  const testRecipient = process.env.MAILER_TEST_RECIPIENT || process.env.SMTP_USER;
  if (!testRecipient) throw new Error("Configure MAILER_TEST_RECIPIENT or SMTP_USER as the test recipient.");
  console.log(`Sending diagnostic test email to ${process.env.MAILER_TEST_RECIPIENT ? 'the configured test recipient' : 'the configured sender mailbox'}...`);

  const result = await sendEmail({
    to: testRecipient,
    subject: "TEST EMAIL — Mercy T College ERP Diagnostic",
    text: "This is an end-to-end diagnostic test email from Mercy T College School ERP SMTP system.",
    html: "<div style='font-family:sans-serif; padding:16px; border:1px solid #D8D2C6; background:#FAF7F2; border-radius:4px;'><h2 style='color:#0A192F;'>Mercy T College SMTP Test</h2><p style='color:#111111;'>If you received this message, the SMTP Mailer delivery pipeline is fully functional!</p></div>"
  });

  console.log("SMTP message result:", JSON.stringify({
    success: result.success,
    messageId: result.messageId,
    response: result.response,
    acceptedCount: result.acceptedCount,
    rejectedCount: result.rejectedCount,
  }));
  console.log("=== DIAGNOSTIC COMPLETE ===");
}

runMailerDiagnostic().catch((error) => {
  console.error("[Mailer Diagnostic Failed]", error.message);
  process.exitCode = 1;
});
