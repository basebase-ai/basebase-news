import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  db,
} from "basebase-js";
import type { UserConnection, User } from "@/types";

export interface IUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  imageUrl?: string;
}

export class ConnectionsService {
  /**
   * Get mutual friends for a user (users who have friended each other)
   */
  async getMutualFriends(userId: string): Promise<IUser[]> {
    try {
      // Get users I've friended
      const myConnectionsQuery = query(
        collection(db, "public/user_connections"),
        where("from", "==", userId),
        where("type", "==", "friend")
      );
      const myConnections = await getDocs(myConnectionsQuery);

      // Get users who've friended me
      const theirConnectionsQuery = query(
        collection(db, "public/user_connections"),
        where("to", "==", userId),
        where("type", "==", "friend")
      );
      const theirConnections = await getDocs(theirConnectionsQuery);

      // Find mutual connections
      const myFriendIds = new Set(
        myConnections.docs.map((doc) => doc.data().to)
      );
      const theirFriendIds = new Set(
        theirConnections.docs.map((doc) => doc.data().from)
      );

      const mutualUserIds = Array.from(myFriendIds).filter((userId) =>
        theirFriendIds.has(userId)
      );

      // Fetch user details from basebase/users
      return await this.getUsersByIds(mutualUserIds);
    } catch (error) {
      console.error("Error getting mutual friends:", error);
      throw error;
    }
  }

  /**
   * Get friend requests for a user (people who friended me but I haven't friended back)
   */
  async getFriendRequests(userId: string): Promise<IUser[]> {
    try {
      // Get users who've friended me
      const incomingConnectionsQuery = query(
        collection(db, "public/user_connections"),
        where("to", "==", userId),
        where("type", "==", "friend")
      );
      const incomingConnections = await getDocs(incomingConnectionsQuery);

      // Get users I've friended
      const myConnectionsQuery = query(
        collection(db, "public/user_connections"),
        where("from", "==", userId),
        where("type", "==", "friend")
      );
      const myConnections = await getDocs(myConnectionsQuery);

      const myFriendIds = new Set(
        myConnections.docs.map((doc) => doc.data().to)
      );

      const requestUserIds = incomingConnections.docs
        .map((doc) => doc.data().from)
        .filter((userId) => !myFriendIds.has(userId));

      return await this.getUsersByIds(requestUserIds);
    } catch (error) {
      console.error("Error getting friend requests:", error);
      throw error;
    }
  }

  /**
   * Get suggested friends (users who are not connected to current user)
   */
  async getSuggestedFriends(userId: string): Promise<IUser[]> {
    try {
      // Get all my connections (both directions)
      const [myConnections, theirConnections] = await Promise.all([
        getDocs(
          query(
            collection(db, "public/user_connections"),
            where("from", "==", userId)
          )
        ),
        getDocs(
          query(
            collection(db, "public/user_connections"),
            where("to", "==", userId)
          )
        ),
      ]);

      // Build set of connected user IDs
      const connectedUserIds = new Set([
        ...myConnections.docs.map((doc) => doc.data().to),
        ...theirConnections.docs.map((doc) => doc.data().from),
      ]);
      connectedUserIds.add(userId); // Exclude self

      // Get all users from basebase/users
      const allUsersQuery = query(collection(db, "basebase/users"));
      const allUsersSnap = await getDocs(allUsersQuery);

      const suggestedUsers: IUser[] = [];
      allUsersSnap.forEach((userDoc) => {
        if (!connectedUserIds.has(userDoc.id)) {
          const userData = userDoc.data();
          suggestedUsers.push({
            id: userDoc.id,
            name: userData?.name || "",
            email: userData?.email,
            phone: userData?.phone || "",
            imageUrl: userData?.imageUrl,
          });
        }
      });

      return suggestedUsers;
    } catch (error) {
      console.error("Error getting suggested friends:", error);
      throw error;
    }
  }

  /**
   * Add a friend connection
   */
  async addFriend(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // Check if connection already exists
      const existingQuery = query(
        collection(db, "public/user_connections"),
        where("from", "==", fromUserId),
        where("to", "==", toUserId),
        where("type", "==", "friend")
      );
      const existing = await getDocs(existingQuery);

      if (existing.docs.length > 0) {
        console.log("Friend connection already exists");
        return;
      }

      const connectionData: UserConnection = {
        from: fromUserId,
        to: toUserId,
        type: "friend",
        createdAt: new Date().toISOString(),
        metadata: {
          app: "newswithfriends",
        },
      };

      await addDoc(collection(db, "public/user_connections"), connectionData);
    } catch (error) {
      console.error("Error adding friend:", error);
      throw error;
    }
  }

  /**
   * Remove a friend connection
   */
  async removeFriend(fromUserId: string, toUserId: string): Promise<void> {
    try {
      const connectionQuery = query(
        collection(db, "public/user_connections"),
        where("from", "==", fromUserId),
        where("to", "==", toUserId),
        where("type", "==", "friend")
      );
      const connections = await getDocs(connectionQuery);

      // Delete all matching connections
      const deletePromises = connections.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  }

  /**
   * Check if two users are mutual friends
   */
  async areMutualFriends(userId: string, friendId: string): Promise<boolean> {
    try {
      // Check if userId friended friendId
      const connection1Query = query(
        collection(db, "public/user_connections"),
        where("from", "==", userId),
        where("to", "==", friendId),
        where("type", "==", "friend")
      );
      const connection1 = await getDocs(connection1Query);

      // Check if friendId friended userId
      const connection2Query = query(
        collection(db, "public/user_connections"),
        where("from", "==", friendId),
        where("to", "==", userId),
        where("type", "==", "friend")
      );
      const connection2 = await getDocs(connection2Query);

      return connection1.docs.length > 0 && connection2.docs.length > 0;
    } catch (error) {
      console.error("Error checking mutual friends:", error);
      return false;
    }
  }

  /**
   * Block a user
   */
  async blockUser(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // Remove any existing friend connections first
      await this.removeFriend(fromUserId, toUserId);
      await this.removeFriend(toUserId, fromUserId);

      // Add block connection
      const blockData: UserConnection = {
        from: fromUserId,
        to: toUserId,
        type: "block",
        createdAt: new Date().toISOString(),
        metadata: {
          app: "newswithfriends",
        },
      };

      await addDoc(collection(db, "public/user_connections"), blockData);
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(fromUserId: string, toUserId: string): Promise<boolean> {
    try {
      const blockQuery = query(
        collection(db, "public/user_connections"),
        where("from", "==", fromUserId),
        where("to", "==", toUserId),
        where("type", "==", "block")
      );
      const blocks = await getDocs(blockQuery);

      return blocks.docs.length > 0;
    } catch (error) {
      console.error("Error checking if user is blocked:", error);
      return false;
    }
  }

  /**
   * Helper method to fetch user details by IDs
   */
  private async getUsersByIds(userIds: string[]): Promise<IUser[]> {
    if (userIds.length === 0) return [];

    try {
      const userPromises = userIds.map(async (userId) => {
        const userRef = doc(db, `basebase/users/${userId}`);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists) {
          const userData = userSnap.data();
          return {
            id: userId,
            name: userData?.name || "",
            email: userData?.email,
            phone: userData?.phone || "",
            imageUrl: userData?.imageUrl,
          } as IUser;
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      return users.filter((user): user is IUser => user !== null);
    } catch (error) {
      console.error("Error fetching users by IDs:", error);
      return [];
    }
  }
}

export const connectionsService = new ConnectionsService();
