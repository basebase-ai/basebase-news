# Basebase Scraper Setup

This document explains how to set up and use the automated scraping system using Basebase cloud tasks.

## Overview

The Basebase scraper is a cloud-based task that automatically scrapes news sources every 5 minutes. It intelligently selects the 10 sources that have been scraped the longest ago (prioritizing sources that have never been scraped).

## Features

- **Automatic scheduling**: Runs every 5 minutes using Basebase triggers
- **Smart source selection**: Always scrapes the 10 most stale sources
- **Priority handling**: Sources that have never been scraped get highest priority
- **Error handling**: Continues processing even if individual sources fail
- **Logging**: Comprehensive logging of scraping operations and results

## Setup

### Prerequisites

1. Ensure you have a Basebase account and project set up
2. Set the `NEXT_PUBLIC_BASEBASE_TOKEN` environment variable in your `.env.local` file
3. For setup operations, also set `NEXT_PUBLIC_BASEBASE_PROJECT` in your `.env.local` file

### Installation

1. **Create the task and trigger:**

   ```bash
   npm run setup-basebase-scraper
   ```

   This script will:
   - Create a cloud task called `scrapeStaleSourcesTask`
   - Set up a trigger called `scrapeStaleSourcesTrigger` to run every 5 minutes
   - Display the next scheduled run time

### Testing

Before relying on the scheduled runs, test the task manually:

```bash
npm run test-basebase-scraper
```

This will execute the scraper task once and show you the results.

## How It Works

### Source Selection Algorithm

1. **Get all sources** from the database
2. **Sort by lastScrapedAt**:
   - Sources with no `lastScrapedAt` (never scraped) come first
   - Remaining sources sorted by oldest `lastScrapedAt` first
3. **Take the first 10** sources from this sorted list
4. **Scrape each source** using the existing RSS feed logic
5. **Update lastScrapedAt** timestamp for successfully scraped sources

### Error Handling

- If a source fails to scrape, the error is logged but the task continues
- Failed sources keep their old `lastScrapedAt` timestamp (so they'll be retried next time)
- Successfully scraped sources get their `lastScrapedAt` updated to the current time

### Schedule

- **Frequency**: Every 5 minutes (`*/5 * * * *` cron expression)
- **Timezone**: UTC
- **Timeout**: 5 minutes per task execution
- **Memory**: 256MB allocated per task

## Monitoring

### Task Execution Results

Each task execution returns a detailed result object:

```json
{
  "message": "Scraper task completed",
  "totalSources": 50,
  "sourcesScraped": 10,
  "successCount": 8,
  "errorCount": 2,
  "results": [
    {
      "sourceId": "source-1",
      "sourceName": "TechCrunch",
      "status": "success"
    },
    {
      "sourceId": "source-2",
      "sourceName": "Failed Source",
      "status": "error",
      "error": "RSS feed not found"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Logs

Check the Basebase dashboard for detailed execution logs and any errors.

## Management

### Updating the Task

If you need to modify the scraper logic:

1. Update the task code in `scripts/setup-basebase-scraper.ts`
2. Run the setup script again: `npm run setup-basebase-scraper`

### Disabling the Scraper

To temporarily disable the scraper, you can disable the trigger in the Basebase dashboard or use the SDK:

```typescript
import { updateTrigger } from "basebase-js";

await updateTrigger("scrapeStaleSourcesTrigger", {
  enabled: false,
});
```

### Removing the Scraper

To completely remove the scraper:

```typescript
import { deleteTask, deleteTrigger } from "basebase-js";

await deleteTrigger("scrapeStaleSourcesTrigger");
await deleteTask("scrapeStaleSourcesTask");
```

## Troubleshooting

### Common Issues

1. **"Task not found" error**: Make sure you've run the setup script first
2. **Authentication errors**: Verify your `NEXT_PUBLIC_BASEBASE_TOKEN` is set correctly in `.env.local`
3. **Setup errors**: For the setup script, ensure `NEXT_PUBLIC_BASEBASE_PROJECT` is also set
4. **Sources not being scraped**: Check that sources have valid RSS URLs configured

### Debugging

Use the test script to debug issues:

```bash
npm run test-basebase-scraper
```

This will show you exactly what the task is doing and any errors it encounters.
