import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, token) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!process.env.APP_BASE_URL) {
    throw new Error("APP_BASE_URL is not configured");
  }

  const fromEmail = process.env.EMAIL_FROM || "m4U <onboarding@resend.dev>";
  const verifyUrl = `${process.env.APP_BASE_URL}/auth/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: "Verify your email address",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Welcome to m4U</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="margin: 24px 0;">
          <a
            href="${verifyUrl}"
            style="background: #4F46E5; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 8px; display: inline-block;"
          >
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send verification email");
  }
}