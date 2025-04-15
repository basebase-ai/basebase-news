import Agenda, { Job } from "agenda";
import { connectDB } from "./mongo.service";
import { scraperService } from "./scraper.service";
import { Source } from "../models/source.model";

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
        await scraperService.scrapeAll();
      } catch (error) {
        console.error("Error in scrape sources job:", error);
      }
    });
  }

  public async start(): Promise<void> {
    await connectDB();
    await this.agenda.start();

    // Schedule the job to run at the start of every hour
    await this.agenda.every("0 * * * *", "scrape sources");

    console.log("Agenda service started - scraping scheduled for every hour");
  }

  public async stop(): Promise<void> {
    await this.agenda.stop();
  }
}

export const agendaService = new AgendaService();
