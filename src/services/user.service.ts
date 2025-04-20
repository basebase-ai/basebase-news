import "dotenv/config";
import { User, IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Source } from "../models/source.model";
import { Response } from "express";
import { Types } from "mongoose";

export class UserService {
  private static instance: UserService;
  private readonly JWT_SECRET: string;
  private readonly transporter: nodemailer.Transporter;

  private constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
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
      // Get default sources with popular tag
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
    const token = this.generateToken((user._id as Types.ObjectId).toString());

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

  public generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: "365d",
    });
  }

  public verifyToken(token: string): { userId: string } {
    return jwt.verify(token, this.JWT_SECRET) as { userId: string };
  }

  public setAuthCookie(res: Response, token: string): void {
    res.cookie("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  public clearAuthCookie(res: Response): void {
    res.clearCookie("auth", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
}

export const userService = UserService.getInstance();
