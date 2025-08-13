import twilio from "twilio";
import { IS_CLOUD } from "./const.js";
import { createServiceLogger } from "./logger/logger.js";

const logger = createServiceLogger("twilio");

let twilioClient: ReturnType<typeof twilio> | undefined;

// Initialize Twilio client only if we have the necessary credentials
if (IS_CLOUD && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export const sendSMS = async (
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  if (!twilioClient) {
    logger.info("Twilio client not initialized - skipping SMS notification");
    return { success: false, error: "SMS not configured" };
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    logger.error("TWILIO_PHONE_NUMBER not configured");
    return { success: false, error: "SMS sender not configured" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    logger.info({ phoneNumber, sid: result.sid }, "Successfully sent SMS");
    return { success: true };
  } catch (error) {
    logger.error({ phoneNumber, error }, "Failed to send SMS");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send SMS" 
    };
  }
};

export const isSMSConfigured = (): boolean => {
  return !!(
    twilioClient && 
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  );
};