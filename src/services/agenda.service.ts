import Agenda, { Job } from "agenda";
import { connectDB } from "./mongo.service";
import { scraperService } from "./scraper.service";
import { Source, ISource } from "../models/source.model";
import { Document, Types } from "mongoose";

class AgendaService {
  private readonly agenda: Agenda;

  constructor() {
    this.agenda = new Agenda({
      db: {
        address: process.env.MONGODB_URI ?? "mongodb://localhost/storylist",
      },
    });

    this.defineJobs();
  }

  private defineJobs(): void {
    // Define the scraping job
    this.agenda.define("scrape sources", async (job: Job) => {
      try {
        const oneHourAgo: Date = new Date(Date.now() - 60 * 60 * 1000);

        type SourceDocument = Document & ISource & { _id: Types.ObjectId };
        const sourcesToScrape: SourceDocument[] = await Source.find({
          $or: [
            { lastScrapedAt: { $lt: oneHourAgo } },
            { lastScrapedAt: { $exists: false } },
          ],
        });

        for (const source of sourcesToScrape) {
          try {
            await scraperService.collectOne(source);
          } catch (error) {
            console.error(`Error scraping source ${source.name}:`, error);
          }
        }
      } catch (error) {
        console.error("Error in scrape sources job:", error);
      }
    });
  }

  public async start(): Promise<void> {
    await connectDB();
    await this.agenda.start();

    // Schedule the job to run every 5 minutes
    await this.agenda.every("*/5 * * * *", "scrape sources");

    console.log(
      "Agenda service started - scraping scheduled for every 5 minutes"
    );
  }

  public async stop(): Promise<void> {
    await this.agenda.stop();
  }
}

export const agendaService = new AgendaService();
