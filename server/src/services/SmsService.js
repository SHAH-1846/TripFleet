const twilio = require('twilio');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

class SmsService {
  constructor() {
    if (config.twilio.accountSid && config.twilio.authToken) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    } else {
      logger.warn('Twilio credentials not configured');
    }
  }

  static async sendOtp(phone, otp) {
    const service = new SmsService();
    
    if (!service.client) {
      logger.warn(`SMS not sent - Twilio not configured. OTP for ${phone}: ${otp}`);
      return;
    }

    try {
      const message = `Your TripFleet verification code is: ${otp}. Valid for ${config.otp.expiryMinutes} minutes.`;
      
      await service.client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phone,
      });

      logger.info('OTP sent successfully', { phone });
    } catch (error) {
      logger.error('Failed to send OTP', { phone, error: error.message });
      throw new AppError('Failed to send OTP. Please try again.');
    }
  }

  static async sendNotification(phone, message) {
    const service = new SmsService();
    
    if (!service.client) {
      logger.warn(`SMS notification not sent - Twilio not configured. Message for ${phone}: ${message}`);
      return;
    }

    try {
      await service.client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phone,
      });

      logger.info('SMS notification sent', { phone });
    } catch (error) {
      logger.error('Failed to send SMS notification', { phone, error: error.message });
      // Don't throw error for notifications
    }
  }
}

module.exports = SmsService;