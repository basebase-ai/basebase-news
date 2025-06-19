import { User, IUser } from "../models/user.model";
import { VerificationCode } from "../models/verification-code.model";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import twilio from "twilio";
import crypto from "crypto";
import { Source } from "../models/source.model";
import { StoryStatus } from "../models/story-status.model";
import { Types } from "mongoose";
import { connectToDatabase } from "./mongodb.service";

export class UserService {
  private static instance: UserService;
  private readonly JWT_SECRET: string;
  private readonly transporter: nodemailer.Transporter;
  private readonly twilioClient?: twilio.Twilio;

  private constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    this.JWT_SECRET = process.env.JWT_SECRET;

    // Validate SMTP configuration
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.error("Missing SMTP configuration:", {
        host: !!process.env.SMTP_HOST,
        port: !!process.env.SMTP_PORT,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS,
      });
      throw new Error("SMTP configuration is incomplete");
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      console.warn("Twilio credentials not found - SMS functionality disabled");
    }
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private generateShortCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // If it already starts with +, return as-is after cleaning
    if (phone.startsWith("+")) {
      return "+" + digits;
    }

    // If it's 10 digits, assume US number and add +1
    if (digits.length === 10) {
      return "+1" + digits;
    }

    // If it's 11 digits and starts with 1, assume US number
    if (digits.length === 11 && digits.startsWith("1")) {
      return "+" + digits;
    }

    // Otherwise, just add + to the front
    return "+" + digits;
  }

  private async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      throw new Error("Twilio not configured - cannot send SMS");
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error("TWILIO_PHONE_NUMBER environment variable not set");
    }

    try {
      console.log(`Sending SMS to ${to}:`, message);
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      console.log("SMS sent successfully:", result.sid);
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw error;
    }
  }

  public async authenticateUser(
    email: string,
    first: string,
    last: string,
    host: string,
    phone?: string
  ): Promise<void> {
    // Ensure database connection
    await connectToDatabase();

    // Normalize phone number if provided
    const normalizedPhone = phone
      ? this.normalizePhoneNumber(phone)
      : undefined;

    // Find user by phone first, then by email
    console.log("Authenticating user:", { email, phone: normalizedPhone });
    let user = null;

    if (normalizedPhone) {
      user = await User.findOne({ phone: normalizedPhone });
      console.log("Found user by phone:", !!user);
    }

    if (!user && email) {
      user = await User.findOne({ email });
      console.log("Found user by email:", !!user);
    }

    if (!user) {
      // Create new user
      console.log("Creating new user");
      const defaultSources = await Source.find({ tags: "popular" });
      const defaultSourceIds = defaultSources.map((source) => source._id);

      const userData: any = {
        email,
        first,
        last,
        sourceIds: defaultSourceIds,
      };

      if (normalizedPhone) {
        userData.phone = normalizedPhone;
      }

      user = await User.create(userData);
    } else {
      // Update existing user with any new information
      let updated = false;

      if (normalizedPhone && user.phone !== normalizedPhone) {
        console.log("Updating user phone number");
        user.phone = normalizedPhone;
        updated = true;
      }

      if (
        email &&
        user.email !== email &&
        !user.email.includes("@temp.placeholder")
      ) {
        console.log("Updating user email");
        user.email = email;
        updated = true;
      }

      if (updated) {
        await user.save();
      }
    }

    // Generate short verification code
    let code: string = this.generateShortCode();
    let codeExists = true;

    // Ensure code is unique
    while (codeExists) {
      const existingCode = await VerificationCode.findOne({ code });
      if (existingCode) {
        code = this.generateShortCode();
      } else {
        codeExists = false;
      }
    }

    // Store verification code with 15-minute expiration
    await VerificationCode.create({
      userId: user._id,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Create short sign-in link
    const signInLink = host.includes("localhost")
      ? `http://${host}/auth/verify?code=${code}`
      : `https://${host}/auth/verify?code=${code}`;

    try {
      if (normalizedPhone) {
        // Send SMS for phone-based authentication
        console.log("Sending SMS verification...");
        const smsMessage = `Your NewsWithFriends sign-in link: ${signInLink}`;
        await this.sendSMS(normalizedPhone, smsMessage);
        console.log("SMS sent successfully!");
      } else if (email) {
        // Send email for email-based authentication
        console.log("Sending email verification...");
        await this.transporter.sendMail({
          from: "noreply@joinable.us",
          to: email,
          subject: "Sign in to NewsWithFriends",
          html: `Your sign-in link: <a href="${signInLink}">${signInLink}</a>`,
        });
        console.log("Email sent successfully!");
      } else {
        throw new Error("No valid contact method available");
      }
    } catch (error) {
      console.error("Failed to send verification:", error);
      throw error;
    }
  }

  public generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: "365d",
    });
  }

  public verifyToken(token: string): { userId: string } {
    return jwt.verify(token, this.JWT_SECRET) as { userId: string };
  }

  public async verifyCode(code: string): Promise<string> {
    await connectToDatabase();

    console.log(`[verifyCode] Looking for code: ${code}`);
    console.log(`[verifyCode] Current time: ${new Date().toISOString()}`);

    // First, let's see if the code exists at all
    const anyCode = await VerificationCode.findOne({ code });
    console.log(`[verifyCode] Code exists in DB: ${!!anyCode}`);
    if (anyCode) {
      console.log(
        `[verifyCode] Code expires at: ${anyCode.expiresAt.toISOString()}`
      );
      console.log(
        `[verifyCode] Code is expired: ${anyCode.expiresAt <= new Date()}`
      );
    }

    const verificationCode = await VerificationCode.findOne({
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationCode) {
      console.log(`[verifyCode] No valid verification code found for: ${code}`);
      throw new Error("Invalid or expired verification code");
    }

    console.log(
      `[verifyCode] Valid code found, generating token for user: ${verificationCode.userId}`
    );

    // Generate JWT for session
    const token = this.generateToken(verificationCode.userId.toString());

    // Clean up used verification code
    await VerificationCode.deleteOne({ _id: verificationCode._id });
    console.log(`[verifyCode] Verification code deleted successfully`);

    return token;
  }
}

export const userService = UserService.getInstance();
