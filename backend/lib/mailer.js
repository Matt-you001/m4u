import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function assertMailerConfig() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
}

async function sendEmail({ email, subject, html }) {
  assertMailerConfig();
  const fromEmail = process.env.EMAIL_FROM || "m4U <no-reply@notifications.techsolutionproviders.net>";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
}

export async function sendVerificationCodeEmail(email, code) {
  return sendEmail({
    email,
    subject: "Your m4U verification code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Welcome to m4U</h2>
        <p>Use this one-time code to verify your email address inside the app:</p>
        <p style="margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4F46E5;">
          ${code}
        </p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetCodeEmail(email, code) {
  return sendEmail({
    email,
    subject: "Your m4U password reset code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Reset your m4U password</h2>
        <p>Use this one-time code inside the app to reset your password:</p>
        <p style="margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4F46E5;">
          ${code}
        </p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendFeedbackEmail({
  userId,
  name,
  email,
  plan,
  category,
  message,
}) {
  assertMailerConfig();

  const fromEmail =
    process.env.EMAIL_FROM ||
    "m4U <no-reply@notifications.techsolutionproviders.net>";
  const feedbackRecipient =
    process.env.FEEDBACK_EMAIL_TO || "contact@techsolutionproviders.net";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [feedbackRecipient],
    replyTo: email,
    subject: `m4U Feedback${category ? `: ${category}` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>New m4U feedback received</h2>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Name:</strong> ${name || "Not provided"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>Category:</strong> ${category || "General"}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
        <p style="white-space: pre-wrap;">${String(message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send feedback email");
  }
}
