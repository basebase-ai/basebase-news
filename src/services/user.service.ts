import "dotenv/config";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Source } from "../models/source.model";

export class UserService {
  private static instance: UserService;
  private readonly JWT_SECRET: string;
  private readonly transporter: nodemailer.Transporter;

  private constructor() {
    this.JWT_SECRET =
      process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public async authenticateUser(
    email: string,
    first: string,
    last: string,
    host: string
  ): Promise<void> {
    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      // Get default sources with top_news_us tag
      const defaultSources = await Source.find({ tags: "popular" });
      const defaultSourceIds = defaultSources.map((source) => source._id);

      user = await User.create({
        email,
        first,
        last,
        sourceIds: defaultSourceIds,
      });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, this.JWT_SECRET, {
      expiresIn: "365d",
    });

    // Create sign-in link
    const signInLink = host.includes("localhost")
      ? `http://${host}/auth/verify?token=${token}`
      : `https://${host}/auth/verify?token=${token}`;

    // Log email content instead of sending
    console.log("\n=== Sign In Email ===");
    console.log("To:", email);
    console.log("Subject: Sign in to StoryList");
    console.log("Link:", signInLink);
    console.log("===================\n");

    try {
      console.log("Attempting to send email...");
      await this.transporter.sendMail({
        from: "noreply@joinable.us",
        to: email,
        subject: "Sign in to StoryList",
        html: `Click <a href="${signInLink}">here</a> to sign in to StoryList.`,
      });
      console.log("Email sent successfully!");
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  public verifyToken(token: string): { userId: string } {
    return jwt.verify(token, this.JWT_SECRET) as { userId: string };
  }
}

export const userService = UserService.getInstance();
