import { Story, IStory } from "../models/story.model";
import mongoose from "mongoose";
import { ISource, Source } from "../models/source.model";
import { scraperService } from "./scraper.service";
import { connectDB } from "./mongo.service";

interface StoryDocument extends IStory, mongoose.Document {}

interface SourceWithStories extends ISource {
  stories: IStory[];
}

export class StoryService {
  private trimSourceFields(source: ISource): Partial<ISource> {
    return {
      name: source.name?.trim(),
      homepageUrl: source.homepageUrl?.trim(),
      rssUrl: source.rssUrl?.trim(),
      includeSelector: source.includeSelector?.trim(),
      excludeSelector: source.excludeSelector?.trim(),
      tags: source.tags?.map((tag) => tag.trim()),
      imageUrl: source.imageUrl?.trim(),
      biasScore: source.biasScore,
      hasPaywall: source.hasPaywall,
    };
  }

  public async addSource(source: ISource): Promise<void> {
    const trimmedSource = this.trimSourceFields(source);
    const exists = await Source.exists({ name: trimmedSource.name });
    if (exists) {
      throw new Error(`Source ${trimmedSource.name} already exists`);
    }
    await Source.create(trimmedSource);
  }

  public async updateSource(sourceId: string, source: ISource): Promise<void> {
    const trimmedSource = this.trimSourceFields(source);
    const updated = await Source.findByIdAndUpdate(sourceId, trimmedSource, {
      new: true,
    });
    if (!updated) {
      throw new Error(`Source with id ${sourceId} not found`);
    }
  }

  public async getSources(): Promise<ISource[]> {
    return Source.find();
  }

  public async addStories(sourceId: string, stories: IStory[]): Promise<void> {
    console.log(`Processing ${stories.length} stories for source ${sourceId}`);

    const objectId = new mongoose.Types.ObjectId(sourceId);

    // Archive existing stories for this source
    const archivedCount = await Story.updateMany(
      { sourceId: objectId, archived: false },
      { archived: true }
    );
    console.log(`Archived ${archivedCount.modifiedCount} existing stories`);

    for (const [index, story] of stories.entries()) {
      const existingStory = await Story.findOne({
        articleUrl: story.articleUrl,
        sourceId: objectId,
      });

      if (existingStory) {
        console.log(`Updating existing story: ${story.articleUrl}`);
        await Story.findByIdAndUpdate(existingStory._id, {
          ...story,
          sourceId: objectId,
          inPageRank: index + 1,
          archived: false,
          updatedAt: new Date(),
        });
      } else {
        console.log(`Creating new story: ${story.articleUrl}`);
        await Story.create({
          ...story,
          sourceId: objectId,
          inPageRank: index + 1,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  public async getStories(sourceId: string): Promise<IStory[]> {
    console.log(`Getting stories for source ${sourceId}`);
    const objectId = new mongoose.Types.ObjectId(sourceId);

    const stories = await Story.find({
      sourceId: objectId,
      archived: false,
    })
      .sort({ inPageRank: 1 })
      .limit(20);

    console.log(
      `Found ${stories.length} stories for source ${sourceId}:`,
      stories
    );
    return stories;
  }
}

export const storyService = new StoryService();
