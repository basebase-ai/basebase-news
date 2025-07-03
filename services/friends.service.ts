import { gql } from "graphql-request";
import { basebaseService } from "./basebase.service";

// GraphQL Queries and Mutations
const GET_USER_FRIENDS = gql`
  query GetUserFriends($userId: ID!) {
    getUser(id: $userId) {
      id
      friends {
        id
        name
        phone
      }
    }
  }
`;

const GET_MUTUAL_FRIENDS = gql`
  query GetMutualFriends($userId: ID!) {
    getUser(id: $userId) {
      id
      friends {
        id
        friends {
          id
          name
          phone
        }
      }
    }
  }
`;

const UPDATE_USER_FRIENDS = gql`
  mutation UpdateUserFriends($userId: ID!, $friendIds: [ID!]!) {
    updateUser(id: $userId, input: { friends: $friendIds }) {
      id
      friends {
        id
        name
        phone
      }
    }
  }
`;

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl?: string;
  friends?: IUser[];
}

interface IFriend {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl?: string;
  friends?: IUser[];
}

export class FriendsService {
  private client: typeof basebaseService;

  constructor() {
    this.client = basebaseService;
  }

  /**
   * Get all friends for a user
   * @param userId The ID of the user
   * @returns Array of friend users
   */
  async getFriends(userId: string): Promise<IUser[]> {
    const response = await this.client.getUser(userId);
    return response.data.friends || [];
  }

  /**
   * Get friend requests for a user (users who have added the current user but haven't been added back)
   * @param userId The ID of the user
   * @returns Array of users who have requested friendship
   */
  async getFriendRequests(userId: string): Promise<IUser[]> {
    const response = await this.client.getUser(userId);
    const userFriends = response.data.friends || [];

    // Get all users who have the current user in their friends list
    const allUsers = await this.client.getAllUsers();
    return allUsers
      .filter((user) => {
        const userFriendsList = user.data.friends || [];
        // Return users who have current user in their friends list but aren't in current user's friends list
        return (
          userFriendsList.includes(userId) && !userFriends.includes(user.id)
        );
      })
      .map((user) => ({
        id: user.id,
        name: user.data.name,
        email: user.data.email,
        phone: user.data.phone,
        imageUrl: user.data.imageUrl,
      }));
  }

  /**
   * Get suggested friends for a user (users who are not friends and haven't requested friendship)
   * @param userId The ID of the user
   * @returns Array of suggested users
   */
  async getSuggestedFriends(userId: string): Promise<IUser[]> {
    const response = await this.client.getUser(userId);
    const userFriends = response.data.friends || [];

    // Get all users
    const allUsers = await this.client.getAllUsers();
    return allUsers
      .filter((user) => {
        if (user.id === userId) return false; // Skip current user
        const userFriendsList = user.data.friends || [];
        // Return users who neither have current user in their friends list nor are in current user's friends list
        return (
          !userFriendsList.includes(userId) && !userFriends.includes(user.id)
        );
      })
      .map((user) => ({
        id: user.id,
        name: user.data.name,
        email: user.data.email,
        phone: user.data.phone,
        imageUrl: user.data.imageUrl,
      }));
  }

  /**
   * Add a friend connection
   * @param userId The ID of the user making the friend request
   * @param friendId The ID of the user to add as a friend
   */
  async addFriend(userId: string, friendId: string): Promise<void> {
    // Get current friends first
    const currentFriends = await this.getFriends(userId);
    const currentFriendIds = currentFriends.map((f) => f.id);

    // Add new friend if not already in list
    if (!currentFriendIds.includes(friendId)) {
      currentFriendIds.push(friendId);
      await this.client.updateUserFriends(userId, currentFriendIds);
    }
  }

  /**
   * Remove a friend connection
   * @param userId The ID of the user removing the friend
   * @param friendId The ID of the user to remove from friends
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Get current friends
    const currentFriends = await this.getFriends(userId);
    const updatedFriendIds = currentFriends
      .map((f) => f.id)
      .filter((id) => id !== friendId);

    // Update friends list without the removed friend
    await this.client.updateUserFriends(userId, updatedFriendIds);
  }

  /**
   * Check if two users are mutual friends (both have each other in their friends list)
   * @param userId First user ID
   * @param friendId Second user ID
   * @returns boolean indicating if they are mutual friends
   */
  async areMutualFriends(userId: string, friendId: string): Promise<boolean> {
    const [userFriends, friendUser] = await Promise.all([
      this.getFriends(userId),
      this.client.getUser(friendId),
    ]);

    const friendFriends = friendUser.data.friends || [];
    return (
      userFriends.some((f) => f.id === friendId) &&
      friendFriends.includes(userId)
    );
  }
}

export const friendsService = new FriendsService();
