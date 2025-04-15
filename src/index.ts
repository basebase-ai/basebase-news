import "dotenv/config";
import express, { Request, Response } from "express";
import { HeadlineService } from "./services/headline.service";
import { connectDB } from "./services/mongo.service";

const app: express.Application = express();
const port: number = 3000;
const headlineService: HeadlineService = new HeadlineService();

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
  "/scrape/:sourceId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`Scraping ${req.params.sourceId}`);
      const headlines = await headlineService.getHeadlines(req.params.sourceId);
      console.log(`Got ${headlines.length} headlines`);
      res.json(headlines);
    } catch (error) {
      res.status(500).json({ status: "error", message: "Scraping failed" });
    }
  }
);

app.post(
  "/scrape/:sourceId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`Adding headlines for ${req.params.sourceId}`);
      await headlineService.addHeadlines(req.params.sourceId);
      res.json({ status: "ok", message: "Headlines added successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Failed to add headlines" });
    }
  }
);

// Connect to MongoDB before starting the server
connectDB().then(() => {
  app.listen(port, (): void => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
