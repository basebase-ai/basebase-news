import { Story, IStory } from "../models/story.model";
import { StoryStatus, IStoryStatus } from "../models/story-status.model";
import mongoose, { PipelineStage, Types } from "mongoose";
import { ISource } from "../models/source.model";
import { scraperService } from "./scraper.service";
import { connectToDatabase } from "./mongodb.service";
import { User, IUser } from "../models/user.model";
import { ConnectionService } from "./connection.service";
import { Source } from "../models/source.model";
import type { IConnection } from "../models/connection.model";

interface StoryDocument extends IStory, mongoose.Document {}

interface SourceWithStories extends ISource {
  stories: IStory[];
}

export class StoryService {
  constructor() {
    connectToDatabase();
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

    console.log(`[Story Debug] Adding/updating story: "${story.fullHeadline}"`);
    console.log(`[Story Debug] Story createdAt from RSS:`, story.createdAt);

    const existingStory = await Story.findOne({
      articleUrl: story.articleUrl,
      sourceId: objectId,
    });

    let result: IStory;

    if (existingStory) {
      console.log(`[Story Debug] Updating existing story: ${story.articleUrl}`);
      console.log(
        `[Story Debug] Existing story createdAt:`,
        existingStory.createdAt
      );
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
      console.log(
        `[Story Debug] Updated story createdAt:`,
        updatedStory.createdAt
      );
      result = updatedStory;
    } else {
      console.log(`[Story Debug] Creating new story: ${story.articleUrl}`);
      const storyToCreate = {
        ...story,
        sourceId: objectId,
        inPageRank: rank !== undefined ? rank : null,
        archived: false,
        createdAt: story.createdAt || new Date(),
        updatedAt: new Date(),
      };
      console.log(
        `[Story Debug] About to save with createdAt:`,
        storyToCreate.createdAt
      );
      result = await Story.create(storyToCreate);
      console.log(`[Story Debug] Saved story createdAt:`, result.createdAt);
    }

    return result;
  }

  public async getStories(
    sourceId: string,
    userId?: string
  ): Promise<IStory[]> {
    console.log(
      `[StoryService.getStories] Called with sourceId: ${sourceId}, userId: ${userId}`
    );

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
    const allStories = [...rankedStories, ...unrankedStories];
    console.log(
      `[StoryService.getStories] Found ${allStories.length} total stories`
    );

    // If userId is provided, add status field to each story
    if (userId) {
      console.log(
        `[StoryService.getStories] Looking up status for userId: ${userId}`
      );
      const storyIds = allStories.map((story) => story._id);
      console.log(
        `[StoryService.getStories] Story IDs to check:`,
        storyIds.slice(0, 3)
      );

      // First, let's see what collections exist
      const collections = await mongoose.connection.db
        ?.listCollections()
        .toArray();
      console.log(
        `[StoryService.getStories] Available collections:`,
        collections?.map((c) => c.name)
      );

      // Check what's in the old HeadlineStatus collection if it exists
      if (collections?.some((c) => c.name === "headlinestatuses")) {
        const oldData = await mongoose.connection.db
          ?.collection("headlinestatuses")
          .find({ userId: new mongoose.Types.ObjectId(userId) })
          .limit(3)
          .toArray();
        console.log(
          `[StoryService.getStories] Old headlinestatuses data:`,
          oldData
        );
      }

      // Check what's in the new StoryStatus collection
      if (collections?.some((c) => c.name === "storystatuses")) {
        const newData = await mongoose.connection.db
          ?.collection("storystatuses")
          .find({ userId: new mongoose.Types.ObjectId(userId) })
          .limit(3)
          .toArray();
        console.log(
          `[StoryService.getStories] New storystatuses data:`,
          newData
        );
      }

      // Check if there are any StoryStatus records for this user
      const allUserStatuses = await StoryStatus.find({
        userId: new mongoose.Types.ObjectId(userId),
      });
      console.log(
        `[StoryService.getStories] All status records for user ${userId}:`,
        allUserStatuses.length
      );

      // If we have no records in StoryStatus but old collection exists, try querying the old collection directly
      if (
        allUserStatuses.length === 0 &&
        collections?.some((c) => c.name === "headlinestatuses")
      ) {
        console.log(
          `[StoryService.getStories] No records in StoryStatus, checking old collection...`
        );
        const oldRecords = await mongoose.connection.db
          ?.collection("headlinestatuses")
          .find({
            userId: new mongoose.Types.ObjectId(userId),
            headlineId: { $in: storyIds },
          })
          .toArray();
        console.log(
          `[StoryService.getStories] Found ${oldRecords?.length} records in old collection:`,
          oldRecords?.slice(0, 2)
        );
      }

      const storyStatuses = await StoryStatus.find({
        userId: new mongoose.Types.ObjectId(userId),
        storyId: { $in: storyIds },
      });

      console.log(
        `[StoryService.getStories] Found ${storyStatuses.length} story statuses:`,
        storyStatuses
      );

      const statusMap = new Map(
        storyStatuses.map((status) => [
          status.storyId.toString(),
          { status: status.status, starred: status.starred },
        ])
      );

      console.log(
        `[StoryService.getStories] Status map:`,
        Array.from(statusMap.entries())
      );

      const storiesWithStatus = allStories.map((story) => {
        const storyStatus = statusMap.get(
          (story._id as mongoose.Types.ObjectId).toString()
        );
        return {
          ...story.toObject(),
          status: storyStatus?.status || null,
          starred: storyStatus?.starred || false,
        };
      });

      console.log(
        `[StoryService.getStories] First few stories with status:`,
        storiesWithStatus.slice(0, 3).map((s) => ({
          id: s._id,
          status: s.status,
          headline: s.fullHeadline?.substring(0, 50),
        }))
      );

      return storiesWithStatus;
    }

    console.log(
      `[StoryService.getStories] No userId provided, returning stories without status`
    );
    return allStories;
  }

  public async addReadId(userId: string, storyId: string): Promise<void> {
    console.log(
      `[UserService.addReadId] Called for userId: ${userId}, storyId: ${storyId}`
    );

    const user = await User.findById(userId);
    if (!user) {
      console.log(`[UserService.addReadId] User not found: ${userId}`);
      throw new Error("User not found");
    }

    // Create or update StoryStatus record
    const result = await StoryStatus.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
      },
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
        status: "READ" as const,
      },
      { upsert: true, new: true }
    );

    console.log(`[UserService.addReadId] StoryStatus upsert result:`, result);
  }

  public async addStar(userId: string, storyId: string): Promise<void> {
    console.log(
      `[StoryService.addStar] Called for userId: ${userId}, storyId: ${storyId}`
    );

    const user = await User.findById(userId);
    if (!user) {
      console.log(`[StoryService.addStar] User not found: ${userId}`);
      throw new Error("User not found");
    }

    await StoryStatus.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
      },
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
        status: "READ" as const,
        starred: true,
      },
      { upsert: true, new: true }
    );
  }

  public async removeStar(userId: string, storyId: string): Promise<void> {
    console.log(
      `[StoryService.removeStar] Called for userId: ${userId}, storyId: ${storyId}`
    );

    const user = await User.findById(userId);
    if (!user) {
      console.log(`[StoryService.removeStar] User not found: ${userId}`);
      throw new Error("User not found");
    }

    await StoryStatus.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
      },
      {
        starred: false,
      },
      { new: true }
    );
  }

  public async getStarredStories(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const connectedUserIds =
      await ConnectionService.getConnections(userObjectId);

    const storyStatuses = await StoryStatus.find({
      userId: { $in: connectedUserIds },
      starred: true,
    })
      .populate({
        path: "storyId",
        select: "fullHeadline articleUrl createdAt sourceId",
      })
      .populate({
        path: "userId",
        select: "_id first last imageUrl email",
      })
      .sort({ createdAt: -1 })
      .limit(50);

    const stories = await Promise.all(
      storyStatuses.map(async (status) => {
        const story = status.storyId as unknown as IStory;
        const user = status.userId as unknown as IUser;
        const source = await Source.findById(story.sourceId)
          .select("name")
          .lean();

        return {
          story: {
            id: (story._id as Types.ObjectId).toString(),
            fullHeadline: story.fullHeadline,
            articleUrl: story.articleUrl,
            createdAt: story.createdAt || new Date(),
            sourceId: story.sourceId.toString(),
            sourceName: source?.name || "Unknown Source",
          },
          user: {
            _id: (user._id as Types.ObjectId).toString(),
            first: user.first,
            last: user.last,
            imageUrl: user.imageUrl,
            email: user.email,
          },
        };
      })
    );

    return stories;
  }
}

export const storyService = new StoryService();
