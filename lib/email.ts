import "server-only";

import nodemailer from "nodemailer";

type SendSiteEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SendSiteEmailResult = {
  delivered: boolean;
  transport: "smtp" | "preview";
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "");
  const from = process.env.MAIL_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : null,
    from,
    user: user || null,
    pass: pass || null,
    secure,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || null,
  };
}

export function isEmailDeliveryConfigured() {
  const config = getMailConfig();
  return Boolean(config.host && config.port && config.from);
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getMailConfig();

  if (!config.host || !config.port || !config.from) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });

  return cachedTransporter;
}

export async function sendSiteEmail(input: SendSiteEmailInput): Promise<SendSiteEmailResult> {
  const config = getMailConfig();
  const transporter = getTransporter();

  if (!transporter || !config.from) {
    console.info(
      `[email preview]\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}`,
    );

    return {
      delivered: false,
      transport: "preview",
    };
  }

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    replyTo: config.replyTo ?? undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    delivered: true,
    transport: "smtp",
  };
}
