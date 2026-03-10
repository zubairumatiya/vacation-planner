import Mailgun from "mailgun.js";
import FormData from "form-data";

/*
export async function emailSender(
  userEmail: string,
  subject: string,
  text: string,
  BASE_URL: string,
  path: string,
  token: string
) {
  new Promise((resolve) => {
    console.log("fake email sent:", subject, text, BASE_URL, path, token);
    resolve(null);
  });
} */

export async function emailSender(
  userEmail: string,
  subject: string,
  text: string,
  BASE_URL: string,
  path: string,
  token: string,
): Promise<void> {
  console.log("initial email before converting:", userEmail);
  userEmail = "zubair.umatiya@gmail.com";
  const domainEmail = process.env.MY_DOMAIN_EMAIL;
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.API_KEY || "API_KEY",
  });
  await mg.messages.create(
    "sandbox0ee2e840946d4bec9838876781bfe078.mailgun.org",
    {
      from: domainEmail,
      to: [`${userEmail}`], // this would noramlly be the email of the user but we assigned it to zubair.umatiya since we are on trial an have to authorize users in mailgun
      subject: `${subject}`,
      text: `${text}: ${BASE_URL}/${path}/?token=${token}`,
    },
  );
}
