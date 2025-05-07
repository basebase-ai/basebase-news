import { Story, IStory } from "../models/story.model";
import mongoose from "mongoose";
import { ISource } from "../models/source.model";
import { scraperService } from "./scraper.service";
import { connectDB } from "./mongo.service";

interface StoryDocument extends IStory, mongoose.Document {}

interface SourceWithStories extends ISource {
  stories: IStory[];
}

export class StoryService {
  public async addStories(sourceId: string, stories: IStory[]): Promise<void> {
    console.log(`Processing ${stories.length} stories for source ${sourceId}`);

    const objectId = new mongoose.Types.ObjectId(sourceId);

    // Set inPageRank to null for existing stories for this source
    const updatedCount = await Story.updateMany(
      { sourceId: objectId, inPageRank: { $ne: null } },
      { inPageRank: null }
    );
    console.log(
      `Updated inPageRank to null for ${updatedCount.modifiedCount} existing stories`
    );

    // Process each story individually
    for (const [index, story] of stories.entries()) {
      await this.addStory(sourceId, story, index + 1);
    }
  }

  /**
   * Adds or updates a single story in the database
   * @param sourceId The ID of the source
   * @param story The story to add or update
   * @param rank The rank of the story on the page (optional)
   * @returns The created or updated story
   */
  public async addStory(
    sourceId: string,
    story: IStory,
    rank?: number
  ): Promise<IStory> {
    const objectId = new mongoose.Types.ObjectId(sourceId);

    const existingStory = await Story.findOne({
      articleUrl: story.articleUrl,
      sourceId: objectId,
    });

    let result: IStory;

    if (existingStory) {
      console.log(`Updating existing story: ${story.articleUrl}`);
      const updatedStory = await Story.findByIdAndUpdate(
        existingStory._id,
        {
          ...story,
          sourceId: objectId,
          inPageRank: rank !== undefined ? rank : null,
          archived: false,
          updatedAt: new Date(),
        },
        { new: true } // Return the updated document
      );

      if (!updatedStory) {
        throw new Error(`Failed to update story: ${existingStory._id}`);
      }

      result = updatedStory;
    } else {
      console.log(`Creating new story: ${story.articleUrl}`);
      result = await Story.create({
        ...story,
        sourceId: objectId,
        inPageRank: rank !== undefined ? rank : null,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return result;
  }

  public async getStories(sourceId: string): Promise<IStory[]> {
    const MAX_STORIES = 25;
    const objectId = new mongoose.Types.ObjectId(sourceId);

    // Get ranked stories first
    const rankedStories = await Story.find({
      sourceId: objectId,
      archived: false,
      inPageRank: { $ne: null },
    }).sort({ inPageRank: 1 });

    // Calculate how many unranked stories we can add
    const remainingSpots = MAX_STORIES - rankedStories.length;

    // If we have spots remaining, get unranked stories sorted by date
    let unrankedStories: StoryDocument[] = [];
    if (remainingSpots > 0) {
      unrankedStories = await Story.find({
        sourceId: objectId,
        archived: false,
        inPageRank: null,
      })
        .sort({ updatedAt: -1 })
        .limit(remainingSpots);
    }

    // Combine both sets of stories
    return [...rankedStories, ...unrankedStories];
  }
}

export const storyService = new StoryService();
