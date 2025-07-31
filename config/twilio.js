const twilio = require('twilio');

let twilioClient = null;

// Only initialize Twilio client if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    console.warn('Twilio client initialization failed:', error.message);
  }
}

const sendOTP = async (phoneNumber, otp) => {
  try {
    if (!twilioClient) {
      console.warn('Twilio not configured, skipping OTP send');
      return { success: true, messageId: 'demo-mode' };
    }

    const message = await twilioClient.messages.create({
      body: `Your CFA verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { twilioClient, sendOTP }; 