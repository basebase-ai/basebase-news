import { Types } from "mongoose";
import { Connection, IConnection } from "../models/connection.model";
import { User, IUser } from "../models/user.model";

export class ConnectionService {
  private static getOrderedIds(
    authUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ): {
    firstId: Types.ObjectId;
    secondId: Types.ObjectId;
    authIsFirst: boolean;
  } {
    const authIdStr = authUserId.toString();
    const targetIdStr = targetUserId.toString();

    if (authIdStr < targetIdStr) {
      return { firstId: authUserId, secondId: targetUserId, authIsFirst: true };
    } else {
      return {
        firstId: targetUserId,
        secondId: authUserId,
        authIsFirst: false,
      };
    }
  }

  static async addConnection(
    authUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ): Promise<IConnection> {
    const { firstId, secondId, authIsFirst } = this.getOrderedIds(
      authUserId,
      targetUserId
    );

    const existingConnection = await Connection.findOne({ firstId, secondId });

    if (!existingConnection) {
      // Create new connection request
      const status = authIsFirst ? "FIRST_REQUESTED" : "SECOND_REQUESTED";
      return await Connection.create({
        firstId,
        secondId,
        status,
      });
    }

    // Handle existing connection based on current status
    switch (existingConnection.status) {
      case "FIRST_REQUESTED":
        if (!authIsFirst) {
          // Second user is accepting the request
          existingConnection.status = "CONNECTED";
          existingConnection.updatedAt = new Date();
          return await existingConnection.save();
        }
        // First user calling again - no change
        return existingConnection;

      case "SECOND_REQUESTED":
        if (authIsFirst) {
          // First user is accepting the request
          existingConnection.status = "CONNECTED";
          existingConnection.updatedAt = new Date();
          return await existingConnection.save();
        }
        // Second user calling again - no change
        return existingConnection;

      case "DISCONNECTED":
        // Reactivate connection request
        const newStatus = authIsFirst ? "FIRST_REQUESTED" : "SECOND_REQUESTED";
        existingConnection.status = newStatus;
        existingConnection.updatedAt = new Date();
        return await existingConnection.save();

      case "CONNECTED":
        // Already connected - no change
        return existingConnection;

      default:
        throw new Error(
          `Invalid connection status: ${existingConnection.status}`
        );
    }
  }

  static async removeConnection(
    authUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ): Promise<IConnection | null> {
    const { firstId, secondId } = this.getOrderedIds(authUserId, targetUserId);

    const connection = await Connection.findOne({ firstId, secondId });

    if (!connection) {
      return null;
    }

    connection.status = "DISCONNECTED";
    connection.updatedAt = new Date();
    return await connection.save();
  }

  static async getConnection(
    authUserId: Types.ObjectId,
    targetUserId: Types.ObjectId
  ): Promise<IConnection | null> {
    const { firstId, secondId } = this.getOrderedIds(authUserId, targetUserId);
    return await Connection.findOne({ firstId, secondId });
  }

  static async getConnections(
    userId: Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const connections = await Connection.find({
      $or: [{ firstId: userId }, { secondId: userId }],
      status: "CONNECTED",
    });

    return connections.map((connection) =>
      connection.firstId.equals(userId)
        ? connection.secondId
        : connection.firstId
    );
  }

  static async getRequests(userId: Types.ObjectId): Promise<IUser[]> {
    const connections = await Connection.find({
      $or: [
        { secondId: userId, status: "FIRST_REQUESTED" },
        { firstId: userId, status: "SECOND_REQUESTED" },
      ],
    }).lean();

    console.log(
      `[getRequests] Found ${connections.length} raw connections for userId: ${userId}`
    );

    const requesterIds = connections.map((c) =>
      c.firstId.equals(userId) ? c.secondId : c.firstId
    );

    console.log(
      `[getRequests] Mapped to ${requesterIds.length} requesterIds:`,
      requesterIds
    );

    const users = await User.find({ _id: { $in: requesterIds } }).lean();

    console.log(`[getRequests] Found ${users.length} user documents`);
    return users;
  }

  static async getConnectedUsers(userId: Types.ObjectId): Promise<IUser[]> {
    const connections = await Connection.find({
      $or: [{ firstId: userId }, { secondId: userId }],
      status: "CONNECTED",
    }).lean();

    console.log(
      `[getConnectedUsers] Found ${connections.length} raw connections for userId: ${userId}`
    );

    const friendIds = connections.map((c) =>
      c.firstId.equals(userId) ? c.secondId : c.firstId
    );

    console.log(
      `[getConnectedUsers] Mapped to ${friendIds.length} friendIds:`,
      friendIds
    );

    const users = await User.find({ _id: { $in: friendIds } }).lean();

    console.log(`[getConnectedUsers] Found ${users.length} user documents`);
    return users;
  }

  static async getSuggestedUsers(userId: Types.ObjectId): Promise<IUser[]> {
    const connections = await Connection.find({
      $or: [{ firstId: userId }, { secondId: userId }],
    });

    console.log(
      `[getSuggestedUsers] Found ${connections.length} existing connections for userId: ${userId}`
    );

    const existingConnectionUserIds = connections.map((c) =>
      (c.firstId as Types.ObjectId).equals(userId)
        ? (c.secondId as Types.ObjectId)
        : (c.firstId as Types.ObjectId)
    );

    const excludedUserIds = [userId, ...existingConnectionUserIds];

    console.log(
      `[getSuggestedUsers] Excluding ${excludedUserIds.length} userIds:`,
      excludedUserIds
    );

    const suggestedUsers = await User.find({
      _id: { $nin: excludedUserIds },
    }).lean();

    console.log(
      `[getSuggestedUsers] Found ${suggestedUsers.length} suggested users`
    );

    return suggestedUsers as IUser[];
  }
}
