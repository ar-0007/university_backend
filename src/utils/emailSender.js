// src/utils/emailSender.js
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter
// For development, you can use Ethereal Email (https://ethereal.email/) for testing.
// For production, use a service like SendGrid, Mailgun, AWS SES, etc.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email', // e.g., 'smtp.sendgrid.net'
  port: parseInt(process.env.EMAIL_PORT || '587', 10), // e.g., 587 or 465
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your_ethereal_user', // e.g., 'apikey' for SendGrid
    pass: process.env.EMAIL_PASS || 'your_ethereal_pass', // e.g., SendGrid API Key
  },
});

const emailSender = {
  /**
   * Sends an email.
   * @param {string} to - Recipient email address.
   * @param {string} subject - Email subject.
   * @param {string} text - Plain text body of the email.
   * @param {string} [html] - HTML body of the email (optional).
   * @returns {Promise<object>} Info about the sent message.
   */
  sendEmail: async (to, subject, text, html) => {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Detailers University" <no-reply@detailersuni.com>',
        to,
        subject,
        text,
        html: html || text, // Use HTML if provided, otherwise plain text
      });
      console.log('Message sent: %s', info.messageId);
      // Preview only if using Ethereal account
      if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email to ${to}: ${error.message}`);
    }
  },
};

module.exports = emailSender;
