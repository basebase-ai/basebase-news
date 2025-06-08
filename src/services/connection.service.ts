import { Types } from "mongoose";
import { Connection, IConnection } from "../models/connection.model";

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

  static async getUserConnections(
    userId: Types.ObjectId,
    status?: IConnection["status"]
  ): Promise<IConnection[]> {
    const query: any = {
      $or: [{ firstId: userId }, { secondId: userId }],
    };

    if (status) {
      query.status = status;
    }

    return await Connection.find(query).populate(
      "firstId secondId",
      "email first last imageUrl"
    );
  }
}
