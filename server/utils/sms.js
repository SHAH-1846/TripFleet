const twilio = require('twilio');
const dotenv = require("dotenv");
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const senderPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

exports.sendSMS = async (to, message) => {
  try {
    await client.messages.create({
      body: message,
      from: senderPhone,
      to,
    });
    console.log("✅ SMS sent to:", to);
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    throw new Error("Failed to send OTP");
  }
};
