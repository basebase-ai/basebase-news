import { NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { userService } from "@/services/user.service";
import nodemailer from "nodemailer";

export async function GET() {
  const health: Record<string, boolean | string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    // Check MongoDB connection
    await connectToDatabase();
    health.mongodb = true;
  } catch (error) {
    health.mongodb = false;
    health.mongodb_error =
      error instanceof Error ? error.message : "Unknown error";
  }

  // Check JWT configuration
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }
    health.jwt = true;
  } catch (error) {
    health.jwt = false;
    health.jwt_error = error instanceof Error ? error.message : "Unknown error";
  }

  // Check SMTP configuration
  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error("SMTP configuration incomplete");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    health.smtp = true;
  } catch (error) {
    health.smtp = false;
    health.smtp_error =
      error instanceof Error ? error.message : "Unknown error";
  }

  // If any service is down, set overall status to error
  if (Object.values(health).some((value) => value === false)) {
    health.status = "error";
  }

  return NextResponse.json(health);
}
