import axios from 'axios';
import { config } from '../config/env.config';
import { logger } from '../utils/logger';

export class EmailService {
  async sendEmail(data: {
    email: string;
    subject: string;
    message: string;
    replyto?: string;
    copyemail?: string;
  }) {
    try {
      const response = await axios({
        url: `${config.email.idealswiftApiUrl}/sendmail/`,
        method: 'POST',
        data: {
          sender: data.replyto ?? config.email.mailNoReply,
          subject: data.subject,
          recipient: data.email,
          message: data.message,
          name: config.email.mailSender,
          copyrecipient: data.copyemail,
        },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Authorization: `Bearer ${config.email.idealswiftMailToken}`,
        },
      });

      logger.info('Email sent successfully', { recipient: data.email, response: response.data });
      return response.data;
    } catch (error: any) {
      logger.error('Email sending failed', {
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  }

  async sendOTP(email: string, otp: string) {
    return this.sendEmail({
      email,
      subject: 'Your OTP Code',
      message: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
    });
  }

  async sendAdminInvite(email: string, inviteLink: string) {
    return this.sendEmail({
      email,
      subject: 'Admin Invitation',
      message: `You have been invited to join as an admin. Click the following link to complete your registration: ${inviteLink}`,
    });
  }

  async sendPasswordReset(email: string, otp: string) {
    return this.sendEmail({
      email,
      subject: 'Password Reset Request',
      message: `Your password reset OTP is: ${otp}. This code will expire in 5 minutes.`,
    });
  }
}

export const emailService = new EmailService();