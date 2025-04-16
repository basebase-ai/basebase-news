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

const app: express.Application = express();
const port: number = parseInt(process.env.PORT || "3000", 10);
const headlineService: HeadlineService = new HeadlineService();

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

app.get("/topsecret", (req: Request, res: Response): void => {
  res.cookie("role", "admin", {
    httpOnly: false,
    secure: process.env.NODE_ENV !== "development",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  res.redirect("/");
});

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
      const sourcesWithHeadlines =
        await headlineService.getSourcesWithHeadlines();
      res.json({
        status: "ok",
        sources: sourcesWithHeadlines,
      });
    } catch (error) {
      console.error("Error getting headlines:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to get headlines" });
    }
  }
);

// Scraping endpoints
app.get("/api/scrape", async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log("Scraping all sources");
    await scraperService.scrapeAll();
    res.json({
      status: "ok",
      message: "All sources scraped successfully",
    });
  } catch (error) {
    console.error("Error scraping sources:", error);
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
