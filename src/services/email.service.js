const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Generic send email function
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html
    });

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Registration Email
async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger!";
  const text = `Hello ${name}, Thank you for registering at Backend Ledger.`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger.</p>`;

  await sendEmail(userEmail, subject, text, html);
}

// Transaction Success Email
async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Successful!";
  const text = `Hello ${name}, Your transaction of $${amount} to account ${toAccount} was successful.`;
  const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} to account ${toAccount} was successful.</p>`;

  await sendEmail(userEmail, subject, text, html);
}

// Transaction Failure Email
async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed";
  const text = `Hello ${name}, Your transaction of $${amount} to account ${toAccount} has failed.`;
  const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} to account ${toAccount} has failed.</p>`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail
};