import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html }) {
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
