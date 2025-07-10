// utils/sendMail.js
import nodemailer from "nodemailer";

export const sendMail = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"FieldConnect" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
};