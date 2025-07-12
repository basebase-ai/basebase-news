import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
} from "basebase";
import { db } from "./basebase.service";

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl?: string;
  friends?: string[]; // Store as array of friend IDs
}

interface IFriend {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl?: string;
  friends?: string[];
}

export class FriendsService {
  /**
   * Get all friends for a user
   * @param userId The ID of the user
   * @returns Array of friend users
   */
  async getFriends(userId: string): Promise<IUser[]> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists) {
        return [];
      }

      const userData = userSnap.data() as IUser;
      const friendIds = userData.friends || [];

      if (friendIds.length === 0) {
        return [];
      }

      // Get all friend documents
      const friendPromises = friendIds.map(async (friendId: string) => {
        const friendRef = doc(db, `users/${friendId}`);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists) {
          return { id: friendSnap.id, ...friendSnap.data() } as IUser;
        }
        return null;
      });

      const friends = await Promise.all(friendPromises);
      return friends.filter((friend): friend is IUser => friend !== null);
    } catch (error) {
      console.error("Error getting friends:", error);
      throw error;
    }
  }

  /**
   * Get friend requests for a user (users who have added the current user but haven't been added back)
   * @param userId The ID of the user
   * @returns Array of users who have requested friendship
   */
  async getFriendRequests(userId: string): Promise<IUser[]> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists) {
        return [];
      }

      const userData = userSnap.data() as IUser;
      const userFriends = userData.friends || [];

      // Get all users who have the current user in their friends list
      const usersCollection = collection(db, "users");
      const usersSnap = await getDocs(usersCollection);

      const friendRequests: IUser[] = [];

      usersSnap.forEach((doc) => {
        const user = { id: doc.id, ...doc.data() } as IUser;
        const userFriendsList = user.friends || [];

        // Return users who have current user in their friends list but aren't in current user's friends list
        if (
          userFriendsList.includes(userId) &&
          !userFriends.includes(user.id)
        ) {
          friendRequests.push(user);
        }
      });

      return friendRequests;
    } catch (error) {
      console.error("Error getting friend requests:", error);
      throw error;
    }
  }

  /**
   * Get suggested friends for a user (users who are not friends and haven't requested friendship)
   * @param userId The ID of the user
   * @returns Array of suggested users
   */
  async getSuggestedFriends(userId: string): Promise<IUser[]> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists) {
        return [];
      }

      const userData = userSnap.data() as IUser;
      const userFriends = userData.friends || [];

      // Get all users
      const usersCollection = collection(db, "users");
      const usersSnap = await getDocs(usersCollection);

      const suggestedFriends: IUser[] = [];

      usersSnap.forEach((doc) => {
        const user = { id: doc.id, ...doc.data() } as IUser;

        if (user.id === userId) return; // Skip current user

        const userFriendsList = user.friends || [];

        // Return users who neither have current user in their friends list nor are in current user's friends list
        if (
          !userFriendsList.includes(userId) &&
          !userFriends.includes(user.id)
        ) {
          suggestedFriends.push(user);
        }
      });

      return suggestedFriends;
    } catch (error) {
      console.error("Error getting suggested friends:", error);
      throw error;
    }
  }

  /**
   * Add a friend connection
   * @param userId The ID of the user making the friend request
   * @param friendId The ID of the user to add as a friend
   */
  async addFriend(userId: string, friendId: string): Promise<void> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      const userData = userSnap.data() as IUser;
      const currentFriends = userData.friends || [];

      // Add new friend if not already in list
      if (!currentFriends.includes(friendId)) {
        const updatedFriends = [...currentFriends, friendId];
        await updateDoc(userRef, { friends: updatedFriends });
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      throw error;
    }
  }

  /**
   * Remove a friend connection
   * @param userId The ID of the user removing the friend
   * @param friendId The ID of the user to remove from friends
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      const userData = userSnap.data() as IUser;
      const currentFriends = userData.friends || [];

      // Remove friend from list
      const updatedFriends = currentFriends.filter((id) => id !== friendId);
      await updateDoc(userRef, { friends: updatedFriends });
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  }

  /**
   * Check if two users are mutual friends (both have each other in their friends list)
   * @param userId First user ID
   * @param friendId Second user ID
   * @returns boolean indicating if they are mutual friends
   */
  async areMutualFriends(userId: string, friendId: string): Promise<boolean> {
    try {
      const userRef = doc(db, `users/${userId}`);
      const friendRef = doc(db, `users/${friendId}`);

      const [userSnap, friendSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(friendRef),
      ]);

      if (!userSnap.exists || !friendSnap.exists) {
        return false;
      }

      const userData = userSnap.data() as IUser;
      const friendData = friendSnap.data() as IUser;

      const userFriends = userData.friends || [];
      const friendFriends = friendData.friends || [];

      return userFriends.includes(friendId) && friendFriends.includes(userId);
    } catch (error) {
      console.error("Error checking mutual friends:", error);
      throw error;
    }
  }
}

export const friendsService = new FriendsService();
