import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { StoryService } from "./services/story.service";
import { connectDB } from "./services/mongo.service";
import { Source } from "./models/source.model";
import { IStory } from "./models/story.model";
import { ScraperService } from "./services/scraper.service";
import { agendaService } from "./services/agenda.service";
import { User } from "./models/user.model";
import { userService } from "./services/user.service";
import { sourceService } from "./services/source.service";
import { previewService } from "./services/preview.service";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

const app: express.Application = express();
const port: number = parseInt(process.env.PORT || "3000", 10);
const storyService: StoryService = new StoryService();
const scraperService: ScraperService = new ScraperService();

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
    const sources = await sourceService.getSources();
    res.json(sources);
  } catch (error) {
    console.error("Error getting sources:", error);
    res.status(500).json({ error: "Internal server error" });
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
        const stories = await scraperService.scrapeSource(source);
        console.log(`Scraped ${stories.length} stories for ${source.name}`);
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
      // Validate required fields
      const { name, homepageUrl, includeSelector } = req.body;
      if (!name || !homepageUrl) {
        res.status(400).json({
          error: "Bad request",
          message: "Name and homepageUrl are required fields",
        });
        return;
      }

      // Normalize URL by removing trailing slashes
      const normalizedUrl = homepageUrl.trim().replace(/\/+$/, "");
      req.body.homepageUrl = normalizedUrl;

      // Check if source with this URL already exists
      const existingSource = await Source.findOne({
        homepageUrl: normalizedUrl,
      });
      if (existingSource) {
        res.status(409).json({
          error: "Conflict",
          message: "A source with this URL already exists",
          source: existingSource,
        });
        return;
      }

      // Create and save the new source
      const newSource = new Source(req.body);
      await newSource.save();

      // Send successful response immediately
      res.json({ source: newSource });

      // Then attempt to scrape asynchronously (after response is sent)
      try {
        console.log(`Scraping new source: ${newSource.name}`);
        const stories = await scraperService.scrapeSource(newSource);
        console.log(`Scraped ${stories.length} stories for ${newSource.name}`);
      } catch (scrapeError) {
        console.error(`Error scraping source ${newSource.name}:`, scrapeError);
        // Scraping errors are logged but don't affect the source creation
      }
    } catch (error) {
      console.error("Error creating source:", error);
      // Handle MongoDB duplicate key errors specifically
      if (
        error instanceof Error &&
        error.name === "MongoServerError" &&
        (error as any).code === 11000
      ) {
        res.status(409).json({
          error: "Conflict",
          message: "A source with this URL already exists",
        });
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Internal server error",
        message: errorMessage,
      });
    }
  }
);

// get a source by id with most recent stories
app.get(
  "/api/sources/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sourceId = req.params.id;
      const source = await Source.findById(sourceId);
      if (!source) {
        res.status(404).json({ error: "Source not found" });
        return;
      }

      const stories = await storyService.getStories(sourceId);
      const sourceWithStories = {
        ...source.toObject(),
        stories,
      };

      res.json({
        source: sourceWithStories,
      });
    } catch (error) {
      console.error("Error getting source:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// update a source (admin only)
app.put(
  "/api/sources/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sourceId = req.params.id;
      const source = req.body;

      // Normalize URL by removing trailing slashes if present
      if (source.homepageUrl) {
        source.homepageUrl = source.homepageUrl.trim().replace(/\/+$/, "");
      }

      await sourceService.updateSource(sourceId, source);
      res.json({ status: "ok", message: "Source updated successfully" });
    } catch (error) {
      console.error("Error updating source:", error);
      res.status(500).json({ error: "Internal server error" });
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

      // Remove sourceId from all users' sourceIds and sourceSubscriptionIds arrays
      await User.updateMany(
        { $or: [{ sourceIds: sourceId }, { sourceSubscriptionIds: sourceId }] },
        {
          $pull: {
            sourceIds: sourceId,
            sourceSubscriptionIds: sourceId,
          },
        }
      );

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

    // Set JWT cookie using UserService
    userService.setAuthCookie(res, token);

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
        userService.clearAuthCookie(res);
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
          sourceSubscriptionIds: user.sourceSubscriptionIds || [],
          readIds: user.readIds || [],
        },
      });
    } catch (error) {
      // Clear invalid token using UserService
      userService.clearAuthCookie(res);
      res.status(401).json({ status: "error", message: "Invalid token" });
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get user's read IDs
app.get(
  "/api/users/me/readids",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.cookies?.auth;
      if (!token) {
        res.status(401).json({ status: "error", message: "Not authenticated" });
        return;
      }

      const { userId } = userService.verifyToken(token);
      const readIds = await userService.getReadIds(userId);

      res.json({
        status: "ok",
        readIds,
      });
    } catch (error) {
      console.error("Error getting read IDs:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to get read IDs" });
    }
  }
);

// Add a read ID
app.post(
  "/api/users/me/readids",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.cookies?.auth;
      if (!token) {
        res.status(401).json({ status: "error", message: "Not authenticated" });
        return;
      }

      const { userId } = userService.verifyToken(token);
      const { storyId } = req.body;

      if (!storyId) {
        res
          .status(400)
          .json({ status: "error", message: "Story ID is required" });
        return;
      }

      const readIds = await userService.addReadId(userId, storyId);

      res.json({
        status: "ok",
        readIds,
      });
    } catch (error) {
      console.error("Error adding read ID:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to add read ID" });
    }
  }
);

// Update all read IDs (for syncing localStorage to server)
app.put(
  "/api/users/me/readids",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.cookies?.auth;
      if (!token) {
        res.status(401).json({ status: "error", message: "Not authenticated" });
        return;
      }

      const { userId } = userService.verifyToken(token);
      const { readIds } = req.body;

      if (!Array.isArray(readIds)) {
        res
          .status(400)
          .json({ status: "error", message: "Read IDs must be an array" });
        return;
      }

      const updatedReadIds = await userService.updateReadIds(userId, readIds);

      res.json({
        status: "ok",
        readIds: updatedReadIds,
      });
    } catch (error) {
      console.error("Error updating read IDs:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to update read IDs" });
    }
  }
);

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
          sourceSubscriptionIds: user.sourceSubscriptionIds.map((id) =>
            id.toString()
          ),
          readIds: user.readIds || [],
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

app.put(
  "/api/users/me/subs",
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

      const { sourceSubscriptionIds } = req.body;
      user.sourceSubscriptionIds = sourceSubscriptionIds.map(
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
          sourceSubscriptionIds: user.sourceSubscriptionIds.map((id) =>
            id.toString()
          ),
          readIds: user.readIds || [],
        },
      });
    } catch (error) {
      console.error("Error updating user subscriptions:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to update subscriptions" });
    }
  }
);

// Sign out endpoint
app.post("/api/auth/signout", (req: Request, res: Response): void => {
  userService.clearAuthCookie(res);
  res.json({ status: "ok", message: "Signed out successfully" });
});

// Secret admin endpoint for complete rescrape
app.post(
  "/api/admin/rescrape",
  isAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      await scraperService.scrapeAllSources();
      res.json({ status: "ok", message: "Complete rescrape initiated" });
    } catch (error) {
      console.error("Error in complete rescrape:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// URL preview endpoint
app.post("/api/preview", async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      res.status(400).json({ status: "error", message: "URL is required" });
      return;
    }

    const preview = await previewService.getPageMetadata(url);
    res.json({ status: "ok", preview });
  } catch (error) {
    console.error("Error fetching preview:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ status: "error", message: errorMessage });
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
