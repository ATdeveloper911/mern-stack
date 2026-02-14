const nodemailer = require('nodemailer');

const sendEmail = async ({ email, subject, message }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject,
    text: message
  };

  await transporter.sendMail(mailOptions);
};

// Remember to set SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD in your backend .env
module.exports = sendEmail;
