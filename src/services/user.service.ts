import { User, IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

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
      user = await User.create({ email, first, last });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, this.JWT_SECRET, {
      expiresIn: "7d",
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

    // Comment out actual email sending for now
    /*
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Sign in to StoryList",
      html: `Click <a href="${signInLink}">here</a> to sign in to StoryList. This link will expire in 7 days.`,
    });
    */
  }

  public verifyToken(token: string): { userId: string } {
    return jwt.verify(token, this.JWT_SECRET) as { userId: string };
  }
}

export const userService = UserService.getInstance();
