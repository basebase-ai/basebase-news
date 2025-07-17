import { connectionsService } from "./connections.service";
import type { IUser } from "./connections.service";

export { IUser };

export class FriendsService {
  /**
   * Get all mutual friends for a user
   * @param userId The ID of the user
   * @returns Array of friend users
   */
  async getFriends(userId: string): Promise<IUser[]> {
    return await connectionsService.getMutualFriends(userId);
  }

  /**
   * Get friend requests for a user (users who have added the current user but haven't been added back)
   * @param userId The ID of the user
   * @returns Array of users who have requested friendship
   */
  async getFriendRequests(userId: string): Promise<IUser[]> {
    return await connectionsService.getFriendRequests(userId);
  }

  /**
   * Get suggested friends for a user (users who are not friends and haven't requested friendship)
   * @param userId The ID of the user
   * @returns Array of suggested users
   */
  async getSuggestedFriends(userId: string): Promise<IUser[]> {
    return await connectionsService.getSuggestedFriends(userId);
  }

  /**
   * Add a friend connection
   * @param userId The ID of the user making the friend request
   * @param friendId The ID of the user to add as a friend
   */
  async addFriend(userId: string, friendId: string): Promise<void> {
    return await connectionsService.addFriend(userId, friendId);
  }

  /**
   * Remove a friend connection
   * @param userId The ID of the user removing the friend
   * @param friendId The ID of the user to remove from friends
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    return await connectionsService.removeFriend(userId, friendId);
  }

  /**
   * Check if two users are mutual friends (both have each other in their friends list)
   * @param userId First user ID
   * @param friendId Second user ID
   * @returns boolean indicating if they are mutual friends
   */
  async areMutualFriends(userId: string, friendId: string): Promise<boolean> {
    return await connectionsService.areMutualFriends(userId, friendId);
  }

  /**
   * Block a user (removes friendship and prevents future connections)
   * @param userId The ID of the user doing the blocking
   * @param blockedUserId The ID of the user to block
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    return await connectionsService.blockUser(userId, blockedUserId);
  }

  /**
   * Check if a user is blocked
   * @param userId The ID of the user checking
   * @param blockedUserId The ID of the potentially blocked user
   * @returns boolean indicating if the user is blocked
   */
  async isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    return await connectionsService.isUserBlocked(userId, blockedUserId);
  }
}

export const friendsService = new FriendsService();
