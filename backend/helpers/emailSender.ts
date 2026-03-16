import { Resend } from "resend";

export async function emailSender(
  userEmail: string,
  subject: string,
  text: string,
  BASE_URL: string,
  path: string,
  token: string,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const domain = process.env.MY_DOMAIN_EMAIL;
  userEmail = "zubair.umatiya@gmail.com";
  const link = `${BASE_URL}/${path}/?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; background-color: #ffffff; padding: 40px 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #faf9f7; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="border-bottom: 3px solid #22c55e; padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #6366f1; font-size: 22px;">Vacation Planner</h1>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">${text}</p>
          <a href="${link}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 11px 26px 8px; border-radius: 8px; font-size: 16px; font-weight: 600; border: 2px solid #515151;">
            ${path === "verify" ? "Verify Email" : "Reset Password"}
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #6366f1; font-size: 12px; word-break: break-all;">${link}</p>
        </div>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: `Vacation-Planner <${domain}>`,
    to: [userEmail],
    subject: subject,
    html: html,
  });

  if (error) {
    console.error("Resend error:", error);
  } else {
    void data;
  }
}
