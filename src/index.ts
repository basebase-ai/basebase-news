import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { HeadlineService } from "./services/headline.service";
import { connectDB } from "./services/mongo.service";
import { Source } from "./models/source.model";
import { IHeadline } from "./models/headline.model";
import { scraperService } from "./services/scraper.service";

const app: express.Application = express();
const port: number = 3000;
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
    secure: process.env.NODE_ENV === "production",
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

app.get(
  "/api/scrape/:sourceId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`Scraping ${req.params.sourceId}`);
      const source = await Source.findById(req.params.sourceId);
      if (!source) {
        throw new Error(`Source with id ${req.params.sourceId} not found`);
      }
      const headlines: IHeadline[] = await scraperService.scrapeSource(
        source.id
      );
      console.log(`Got ${headlines.length} headlines`);
      const result = await headlineService.addHeadlines(source.id, headlines);
      res.json({
        status: "ok",
        count: headlines.length,
        headlines,
      });
    } catch (error) {
      console.error("Error scraping source:", error);
      res.status(500).json({ status: "error", message: "Scraping failed" });
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

// Connect to MongoDB before starting the server
connectDB().then(() => {
  app.listen(port, (): void => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
