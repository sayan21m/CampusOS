import { Resend } from "resend";

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendMail({ to, subject, html }) {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("RESEND ERROR:", error);
    throw new Error("Failed to send email");
  }

  console.log("EMAIL SENT:", data);

  return data;
}
