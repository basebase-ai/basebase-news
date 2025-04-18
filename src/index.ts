import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { HeadlineService } from "./services/headline.service";
import { connectDB } from "./services/mongo.service";
import { Source } from "./models/source.model";
import { IHeadline } from "./models/headline.model";
import { scraperService } from "./services/scraper.service";
import { agendaService } from "./services/agenda.service";
import { User } from "./models/user.model";
import { userService } from "./services/user.service";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import mongoose from "mongoose";

const app: express.Application = express();
const port: number = parseInt(process.env.PORT || "3000", 10);
const headlineService: HeadlineService = new HeadlineService();
const JWT_SECRET: string =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Middleware to check if user is admin
const isAdmin = async (
  req: Request,
  res: Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.auth;
    if (!token) {
      res.status(401).json({ status: "error", message: "Not authenticated" });
      return;
    }

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);
    if (!user || !user.isAdmin) {
      res.status(403).json({ status: "error", message: "Not authorized" });
      return;
    }
    next();
  } catch (error) {
    res.status(401).json({ status: "error", message: "Invalid token" });
  }
};

app.get("/hello", (req: Request, res: Response): void => {
  res.json({ status: "ok", message: "Hello from Express!" });
});

// returns all of the possible sources
app.get("/api/sources", async (_req: Request, res: Response): Promise<void> => {
  try {
    const sources = await headlineService.getSources();
    res.json(sources);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to get sources" });
  }
});

app.post(
  "/api/sources/:sourceId/scrape",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      const source = await Source.findById(sourceId);
      if (!source) {
        console.error(`Source not found: ${sourceId}`);
        res.status(404).json({ status: "error", message: "Source not found" });
        return;
      }

      // Return success immediately
      res.json({
        status: "ok",
        message: "Source queued for scraping",
      });

      // Process scraping asynchronously
      console.log(`Scraping source: ${source.name}`);
      try {
        const headlines = await scraperService.collectOne(source);
        console.log(`Scraped ${headlines.length} headlines for ${source.name}`);
      } catch (error) {
        console.error(`Error scraping source ${source.name}:`, error);
        if (error instanceof Error) {
          console.error("Error name:", error.name);
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
      }
    } catch (error) {
      console.error("Error in scrape endpoint:", error);
      // Don't send response here since we already sent it
    }
  }
);

// Source management endpoints
app.post(
  "/api/sources",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const source = req.body;
      const newSource = await Source.create(source);
      res
        .status(201)
        .json({ status: "ok", message: "Source added successfully" });

      console.log(`Scraping new source: ${newSource.name}`);
      try {
        const headlines = await scraperService.collectOne(newSource);
        console.log(
          `Scraped ${headlines.length} headlines for ${newSource.name}`
        );
      } catch (error) {
        console.error(`Error scraping new source ${newSource.name}:`, error);
      }
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to add source";
      res.status(400).json({ status: "error", message });
    }
  }
);

// get a source by id with most recent headlines
app.get(
  "/api/sources/:sourceId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      const source = await Source.findById(sourceId);
      if (!source) {
        res.status(404).json({ status: "error", message: "Source not found" });
        return;
      }
      const headlines = await headlineService.getHeadlines(sourceId);
      res.json({
        status: "ok",
        source: {
          ...source.toObject(),
          headlines,
        },
      });
    } catch (error) {
      console.error("Error getting source:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to get source" });
    }
  }
);

// update a source (admin only)
app.put(
  "/api/sources/:sourceId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      const source = req.body;
      const token = req.cookies?.auth;

      if (!token) {
        res.status(401).json({ status: "error", message: "Not authenticated" });
        return;
      }

      const { userId } = userService.verifyToken(token);
      const user = await User.findById(userId);
      if (!user || !user.isAdmin) {
        res.status(403).json({ status: "error", message: "Not authorized" });
        return;
      }

      await headlineService.updateSource(sourceId, source);
      res.json({ status: "ok", message: "Source updated successfully" });
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to update source";
      res.status(400).json({ status: "error", message });
    }
  }
);

app.delete(
  "/api/sources/:sourceId",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      await Source.findByIdAndDelete(sourceId);
      res.json({ status: "ok", message: "Source deleted successfully" });
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to delete source";
      res.status(400).json({ status: "error", message });
    }
  }
);

// get sources by tag
app.get(
  "/api/sources/tag/:tag",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tag } = req.params;
      const sources = await Source.find({ tags: tag });
      const sourceIds = sources.map((source) => source.id);

      res.json({
        status: "ok",
        sourceIds,
      });
    } catch (error) {
      console.error("Error getting sources by tag:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to get sources by tag" });
    }
  }
);

// Auth endpoints
app.post(
  "/api/auth/signin",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, first, last } = req.body;
      await userService.authenticateUser(
        email,
        first,
        last,
        req.get("host") || ""
      );
      res.json({ status: "ok", message: "Sign-in email sent" });
    } catch (error) {
      console.error("Sign-in error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to process sign-in" });
    }
  }
);

app.get("/auth/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      throw new Error("Invalid token");
    }

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Set JWT cookie
    res.cookie("auth", token, {
      httpOnly: true,
      secure: req.protocol === "https",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    res.redirect("/");
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(400).send("Invalid or expired sign-in link");
  }
});

// Get current user endpoint
app.get("/api/auth/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.auth;
    if (!token) {
      res.status(401).json({ status: "error", message: "Not authenticated" });
      return;
    }

    try {
      const { userId } = userService.verifyToken(token);
      const user = await User.findById(userId);

      if (!user) {
        res.clearCookie("auth", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        res.status(404).json({ status: "error", message: "User not found" });
        return;
      }

      res.json({
        status: "ok",
        user: {
          id: user._id,
          email: user.email,
          first: user.first,
          last: user.last,
          isAdmin: user.isAdmin,
          sourceIds: user.sourceIds || [],
        },
      });
    } catch (error) {
      // Clear invalid token
      res.clearCookie("auth", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.status(401).json({ status: "error", message: "Invalid token" });
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

app.put(
  "/api/users/me/sources",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.cookies?.auth;
      if (!token) {
        res.status(401).json({ status: "error", message: "Not authenticated" });
        return;
      }

      const { userId } = userService.verifyToken(token);
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ status: "error", message: "User not found" });
        return;
      }

      const { sourceIds } = req.body;
      user.sourceIds = sourceIds.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
      await user.save();

      res.json({
        status: "ok",
        user: {
          id: user._id,
          email: user.email,
          first: user.first,
          last: user.last,
          isAdmin: user.isAdmin,
          sourceIds: user.sourceIds.map((id) => id.toString()),
        },
      });
    } catch (error) {
      console.error("Error updating user sources:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to update sources" });
    }
  }
);

// Sign out endpoint
app.post("/api/auth/signout", (req: Request, res: Response): void => {
  res.clearCookie("auth", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ status: "ok", message: "Signed out successfully" });
});

// Start the server and agenda service
async function startServer(): Promise<void> {
  try {
    await connectDB();
    await agendaService.start();

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await agendaService.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await agendaService.stop();
  process.exit(0);
});

startServer();
