import { connectToDatabase } from "./mongodb.service";
import Agenda, { Job } from "agenda";
import { scraperService } from "./scraper.service";
import { Source, ISource } from "../models/source.model";
import { Document, Types } from "mongoose";

class AgendaService {
  private readonly agenda: Agenda;

  constructor() {
    this.agenda = new Agenda({
      db: { address: process.env.MONGODB_URI! },
    });

    this.defineJobs();
  }

  private defineJobs(): void {
    // Define the scraping job
    this.agenda.define("scrape sources", async (job: Job) => {
      console.log("Scraping sources...");
      await scraperService.scrapeAllSources();
    });
  }

  public async start(): Promise<void> {
    await connectToDatabase();
    await this.agenda.start();
    console.log("Agenda started");

    const jobs = await this.agenda.jobs({ name: "scrape sources" });
    if (jobs.length === 0) {
      console.log("No 'scrape sources' job found, creating one.");
      await this.agenda.every("1 hour", "scrape sources");
    } else {
      console.log("'scrape sources' job already exists.");
    }
  }

  public async stop(): Promise<void> {
    await this.agenda.stop();
  }

  public async scheduleScrape(): Promise<void> {
    await this.agenda.now("scrape sources", {});
  }
}

export const agendaService = new AgendaService();
