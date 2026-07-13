import nodemailer from "nodemailer";
import { logger } from "./logger";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("----------------------------");
  console.log("host", host);
  console.log("port", port);
  console.log("user", user);
  console.log("pass", pass);
  console.log("----------------------------");

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@kanji-trainer.app";
  const transport = getTransport();

  const subject = "Kanji Trainer — Reset your password";
  const text = `Reset your password by opening this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `<p>Reset your password by clicking the link below (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`;

  if (!transport) {
    logger.info({ to, resetUrl }, "Password reset email (SMTP not configured — dev log)");
    return;
  }

  await transport.sendMail({ from, to, subject, text, html });
}
