const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration not found. Email service will be disabled.');
      this.transporter = null;
      return;
    }

    // Configure email transporter with better error handling
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Add timeout settings to prevent hanging
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 60000,     // 60 seconds
        debug: process.env.NODE_ENV === 'development', // Enable debug in development
        logger: process.env.NODE_ENV === 'development'  // Enable logging in development
      });

      // Test the connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service connection failed:', error.message);
          console.log('⚠️  Email service will be disabled. Check your .env configuration.');
          this.transporter = null;
        } else {
          console.log('✅ Email service connected successfully!');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Send mentorship booking confirmation email
   */
  async sendMentorshipConfirmation(bookingData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping mentorship confirmation email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        instructorName,
        scheduledDate,
        scheduledTime,
        meetingLink,
        price
      } = bookingData;

      const subject = `Mentorship Session Confirmation - ${instructorName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mentorship Session Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Mentorship Session Confirmed!</h1>
            </div>
            
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Your mentorship session has been successfully booked! Here are the details:</p>
              
              <div class="details">
                <h3>Session Details:</h3>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <p><strong>Date:</strong> ${scheduledDate}</p>
                <p><strong>Time:</strong> ${scheduledTime}</p>
                <p><strong>Duration:</strong> 60 minutes</p>
                <p><strong>Price:</strong> $${price}</p>
              </div>
              
              <p><strong>Meeting Link:</strong></p>
              <a href="${meetingLink}" class="button">Join Meeting</a>
              
              <p><strong>Important Notes:</strong></p>
              <ul>
                <li>Please join the meeting 5 minutes before the scheduled time</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Have your questions and topics ready</li>
                <li>Test your microphone and camera beforehand</li>
              </ul>
              
              <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
              
              <p>We're excited to help you accelerate your learning journey!</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you have any questions, contact us at support@university.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: customerEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Mentorship confirmation email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending mentorship confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send instructor notification email
   */
  async sendInstructorNotification(instructorEmail, bookingData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping instructor notification email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        scheduledDate,
        scheduledTime,
        meetingLink
      } = bookingData;

      const subject = `New Mentorship Booking - ${customerName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Mentorship Booking</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Mentorship Booking</h1>
            </div>
            
            <div class="content">
              <p>You have a new mentorship session booked!</p>
              
              <div class="details">
                <h3>Student Details:</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Date:</strong> ${scheduledDate}</p>
                <p><strong>Time:</strong> ${scheduledTime}</p>
                <p><strong>Duration:</strong> 60 minutes</p>
              </div>
              
              <p><strong>Meeting Link:</strong></p>
              <a href="${meetingLink}" class="button">Join Meeting</a>
              
              <p>Please prepare for the session and ensure you're available at the scheduled time.</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: instructorEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Instructor notification email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending instructor notification email:', error);
      throw error;
    }
  }

  /**
   * Send booking cancellation email to customer
   */
  async sendBookingCancellation(bookingData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping booking cancellation email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        instructorName,
        scheduledDate,
        scheduledTime,
        price
      } = bookingData;

      const subject = `Mentorship Session Cancelled - ${instructorName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mentorship Session Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff5f5; padding: 20px; text-align: center; border-radius: 8px; border-left: 4px solid #f56565; }
            .content { padding: 20px; }
            .details { background: #f7fafc; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background: #4299e1; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Mentorship Session Cancelled</h1>
            </div>
            
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Your mentorship session has been cancelled. Here are the details of the cancelled session:</p>
              
              <div class="details">
                <h3>Cancelled Session Details:</h3>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <p><strong>Date:</strong> ${scheduledDate}</p>
                <p><strong>Time:</strong> ${scheduledTime}</p>
                <p><strong>Price:</strong> $${price}</p>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>If you paid for this session, a refund will be processed within 3-5 business days</li>
                <li>You can book a new session with any available instructor</li>
                <li>Contact us if you have any questions about the cancellation</li>
              </ul>
              
              <p>We apologize for any inconvenience this may have caused.</p>
              
              <p>If you'd like to reschedule, please visit our website to book a new session.</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you have any questions, contact us at support@university.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: customerEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Booking cancellation email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending booking cancellation email:', error);
      throw error;
    }
  }

  /**
   * Send instructor cancellation notification email
   */
  async sendInstructorCancellationNotification(instructorEmail, bookingData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping instructor cancellation notification email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        scheduledDate,
        scheduledTime
      } = bookingData;

      const subject = `Mentorship Session Cancelled - ${customerName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mentorship Session Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff5f5; padding: 20px; text-align: center; border-radius: 8px; border-left: 4px solid #f56565; }
            .content { padding: 20px; }
            .details { background: #f7fafc; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Mentorship Session Cancelled</h1>
            </div>
            
            <div class="content">
              <p>A mentorship session has been cancelled.</p>
              
              <div class="details">
                <h3>Cancelled Session Details:</h3>
                <p><strong>Student Name:</strong> ${customerName}</p>
                <p><strong>Student Email:</strong> ${customerEmail}</p>
                <p><strong>Date:</strong> ${scheduledDate}</p>
                <p><strong>Time:</strong> ${scheduledTime}</p>
              </div>
              
              <p>This session has been removed from your schedule. You are now available for this time slot.</p>
              
              <p>If you have any questions, please contact the administration.</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: instructorEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Instructor cancellation notification email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending instructor cancellation notification email:', error);
      throw error;
    }
  }

  /**
   * Send course purchase confirmation email to customer
   */
  async sendCoursePurchaseConfirmation(purchaseData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping course purchase confirmation email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        courseTitle,
        coursePrice,
        accessCode,
        instructorName
      } = purchaseData;

      const subject = `Course Purchase Confirmation - ${courseTitle}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Course Purchase Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px; color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .access-code { background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; color: #1976d2; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Course Purchase Confirmed!</h1>
              <p>Welcome to your learning journey!</p>
            </div>
            
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Thank you for purchasing <strong>${courseTitle}</strong>! Your course is now ready for you to start learning.</p>
              
              <div class="details">
                <h3>Course Details:</h3>
                <p><strong>Course:</strong> ${courseTitle}</p>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <p><strong>Price:</strong> $${coursePrice}</p>
                <p><strong>Access:</strong> Lifetime access</p>
              </div>
              
              <h3>Your Access Code:</h3>
              <div class="access-code">${accessCode}</div>
              
              <p><strong>How to access your course:</strong></p>
              <ol>
                <li>Visit our course platform</li>
                <li>Enter your access code: <strong>${accessCode}</strong></li>
                <li>Start learning immediately!</li>
              </ol>
              
              <p><strong>What you'll get:</strong></p>
              <ul>
                <li>Complete course content with video lessons</li>
                <li>Downloadable resources and materials</li>
                <li>Certificate of completion</li>
                <li>Lifetime access to course updates</li>
              </ul>
              
              <p>If you have any questions or need support, please don't hesitate to contact us.</p>
              
              <p>Happy learning!</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you have any questions, contact us at support@university.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: customerEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Course purchase confirmation email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending course purchase confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send instructor course purchase notification email
   */
  async sendInstructorCoursePurchaseNotification(instructorEmail, purchaseData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping instructor course purchase notification email.');
        return { messageId: 'email_disabled' };
      }

      const {
        customerName,
        customerEmail,
        courseTitle,
        coursePrice
      } = purchaseData;

      const subject = `New Course Purchase - ${courseTitle}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Course Purchase</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px; color: white; }
            .content { padding: 30px; }
            .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 New Course Purchase!</h1>
              <p>Congratulations on a new student!</p>
            </div>
            
            <div class="content">
              <p>Great news! You have a new student enrolled in your course.</p>
              
              <div class="details">
                <h3>Purchase Details:</h3>
                <p><strong>Course:</strong> ${courseTitle}</p>
                <p><strong>Student Name:</strong> ${customerName}</p>
                <p><strong>Student Email:</strong> ${customerEmail}</p>
                <p><strong>Course Price:</strong> $${coursePrice}</p>
                <p><strong>Purchase Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>Your course is helping students learn and grow. Keep up the excellent work!</p>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: instructorEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Instructor course purchase notification email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending instructor course purchase notification email:', error);
      throw error;
    }
  }

  /**
   * Send user credentials email after successful course purchase
   */
  async sendUserCredentialsEmail(userData, courseTitle, accessCode) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.log('Email service not configured. Skipping user credentials email.');
        return { messageId: 'email_disabled' };
      }

      const {
        email,
        username,
        first_name,
        last_name,
        plainPassword
      } = userData;

      const subject = `Your University Account Credentials - Course Access`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Your University Account Credentials</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e6fffa; padding: 20px; text-align: center; border-radius: 8px; border-left: 4px solid #38b2ac; }
            .content { padding: 20px; }
            .credentials { background: #f7fafc; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4299e1; }
            .warning { background: #fff5f5; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f56565; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .code { font-family: monospace; background: #edf2f7; padding: 8px 12px; border-radius: 4px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Welcome to University!</h1>
              <p>Your account has been created successfully</p>
            </div>
            
            <div class="content">
              <p>Dear ${first_name} ${last_name},</p>
              
              <p>Thank you for purchasing <strong>${courseTitle}</strong>! Your university account has been created automatically.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials:</h3>
                <p><strong>Username:</strong> <span class="code">${username}</span></p>
                <p><strong>Password:</strong> <span class="code">${plainPassword}</span></p>
                <p><strong>Email:</strong> ${email}</p>
              </div>

              <div class="credentials">
                <h3>🎯 Course Access:</h3>
                <p><strong>Course:</strong> ${courseTitle}</p>
                <p><strong>Access Code:</strong> <span class="code">${accessCode}</span></p>
              </div>
              
              <div class="warning">
                <h3>⚠️ Important Security Notice:</h3>
                <ul>
                  <li>Please change your password after your first login</li>
                  <li>Keep your credentials secure and don't share them</li>
                  <li>Use the access code to unlock your course content</li>
                </ul>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Login to your account using the credentials above</li>
                <li>Change your password in the profile settings</li>
                <li>Use the access code to unlock your course</li>
                <li>Start learning!</li>
              </ol>
              
              <p>Best regards,<br>The University Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@university.com',
        to: email,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('User credentials email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending user credentials email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 