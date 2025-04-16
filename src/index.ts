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
const isAdmin = (
  req: Request,
  res: Response,
  next: express.NextFunction
): void => {
  const role: string | undefined = req.cookies?.role;
  if (role !== "admin") {
    res.status(403).json({ status: "error", message: "Unauthorized" });
    return;
  }
  next();
};

app.get("/hello", (req: Request, res: Response): void => {
  res.json({ status: "ok", message: "Hello from Express!" });
});

app.get("/sources", async (_req: Request, res: Response): Promise<void> => {
  try {
    const sources = await headlineService.getSources();
    res.json(sources);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to get sources" });
  }
});

app.get(
  "/api/headlines",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log("Fetching headlines...");
      const sourcesWithHeadlines =
        await headlineService.getSourcesWithHeadlines();
      console.log(
        `Found ${sourcesWithHeadlines.length} sources with headlines`
      );
      console.log(
        "Sample source:",
        JSON.stringify(sourcesWithHeadlines[0], null, 2)
      );
      res.json({
        status: "ok",
        sources: sourcesWithHeadlines,
      });
    } catch (error) {
      console.error("Error getting headlines:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res
        .status(500)
        .json({ status: "error", message: "Failed to get headlines" });
    }
  }
);

// Scraping endpoints
app.get("/api/scrape", async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log("Starting scrape of all sources...");
    const sources = await Source.find();
    console.log(`Found ${sources.length} sources to scrape`);
    await scraperService.scrapeAll();
    console.log("Scrape completed successfully");
    res.json({
      status: "ok",
      message: "All sources scraped successfully",
    });
  } catch (error) {
    console.error("Error scraping sources:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    const message = error instanceof Error ? error.message : "Scraping failed";
    res.status(500).json({ status: "error", message });
  }
});

app.post(
  "/api/sources/:sourceId/scrape",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      const source = await Source.findById(sourceId);
      if (!source) {
        throw new Error(`Source with id ${sourceId} not found`);
      }

      // Return success immediately
      res.json({
        status: "ok",
        message: "Source queued for scraping",
      });

      // Process scraping asynchronously
      console.log(`Scraping source: ${source.name}`);
      const headlines = await scraperService.scrapeSource(source.id);
      console.log(`Scraped ${headlines.length} headlines for ${source.name}`);
    } catch (error) {
      console.error("Error scraping source:", error);
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
      await headlineService.addSource(source);
      res
        .status(201)
        .json({ status: "ok", message: "Source added successfully" });
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to add source";
      res.status(400).json({ status: "error", message });
    }
  }
);

app.put(
  "/api/sources/:sourceId",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceId } = req.params;
      const source = req.body;
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
        req.get("host") || "",
        req.protocol
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
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
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
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({ status: "error", message: "Invalid token" });
  }
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
