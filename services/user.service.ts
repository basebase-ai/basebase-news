import { doc, getDoc, updateDoc, getAuthState, db } from "basebase-js";
import { User } from "@/types";

interface BaseBaseUser {
  name: string;
  phone: string;
  email?: string;
  imageUrl?: string;
}

interface NewsWithFriendsUser {
  sourceIds: string[];
  denseMode?: boolean;
  darkMode?: boolean;
}

interface UserPreferences {
  denseMode?: boolean;
  darkMode?: boolean;
}

function getUserIdFromToken(token: string): string {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.userId;
}

function getCurrentUserId(): string | null {
  const authState = getAuthState();
  return authState.user?.id || null;
}

export class UserService {
  async getCurrentUser(): Promise<User | null> {
    try {
      console.log("[UserService] Getting current user");

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("[UserService] No authenticated user found");
        return null;
      }

      console.log(`[UserService] Using userId: ${userId}`);

      // Fetch user data from both collections
      const basebaseUserPath = `users/${userId}`;
      const newsUserPath = `users/${userId}`;

      console.log(
        `[UserService] Requesting BaseBase doc path: ${basebaseUserPath} (collection: basebase)`
      );
      console.log(
        `[UserService] Requesting NewsWithFriends doc path: ${newsUserPath} (collection: newswithfriends)`
      );

      const [basebaseUserRef, newsUserRef] = [
        doc(db, `basebase/${basebaseUserPath}`),
        doc(db, `newswithfriends/${newsUserPath}`),
      ];

      const [basebaseUserSnap, newsUserSnap] = await Promise.all([
        getDoc(basebaseUserRef),
        getDoc(newsUserRef),
      ]);

      console.log(
        `[UserService] BaseBase doc exists: ${basebaseUserSnap.exists}`
      );
      console.log(
        `[UserService] NewsWithFriends doc exists: ${newsUserSnap.exists}`
      );

      if (!basebaseUserSnap.exists) {
        console.error(
          `[UserService] BaseBase user document does not exist for userId: ${userId}`
        );
        return null;
      }

      const basebaseUser = basebaseUserSnap.data() as BaseBaseUser;
      console.log(`[UserService] BaseBase user data:`, basebaseUser);

      const newsUser = newsUserSnap.exists
        ? (newsUserSnap.data() as NewsWithFriendsUser)
        : { sourceIds: [], denseMode: false, darkMode: false };

      console.log(`[UserService] NewsWithFriends user data:`, newsUser);
      console.log(
        `[UserService] User sourceIds from NewsWithFriends: ${newsUser.sourceIds?.length || 0} sources:`,
        newsUser.sourceIds
      );

      // Parse the name into first and last
      const nameParts = basebaseUser.name.split(" ");
      const first = nameParts[0] || "";
      const last = nameParts.slice(1).join(" ") || "";

      // Combine the data into the expected user format
      const user: User = {
        id: userId,
        first,
        last,
        phone: basebaseUser.phone,
        email: basebaseUser.email || "",
        imageUrl: basebaseUser.imageUrl,
        sourceIds: newsUser.sourceIds || [],
        denseMode: newsUser.denseMode || false,
        darkMode: newsUser.darkMode || false,
      };

      console.log(
        `[UserService] Returning user object with ${user.sourceIds.length} sourceIds:`,
        user.sourceIds
      );
      return user;
    } catch (error) {
      console.error("[UserService] Error getting current user:", error);
      return null;
    }
  }

  async updateUserSources(sourceIds: string[]): Promise<boolean> {
    try {
      console.log("[UserService] Updating user sources to:", sourceIds);

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("[UserService] No authenticated user found");
        return false;
      }

      const userRef = doc(db, `newswithfriends/users/${userId}`);
      await updateDoc(userRef, { sourceIds });
      return true;
    } catch (error) {
      console.error("[UserService] Error updating user sources:", error);
      return false;
    }
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      console.log("[UserService] Updating user preferences:", preferences);

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("[UserService] No authenticated user found");
        return false;
      }

      const userRef = doc(db, `newswithfriends/users/${userId}`);

      const updateData: Record<string, any> = {};
      if (preferences.denseMode !== undefined)
        updateData.denseMode = preferences.denseMode;
      if (preferences.darkMode !== undefined)
        updateData.darkMode = preferences.darkMode;

      await updateDoc(userRef, updateData);
      return true;
    } catch (error) {
      console.error("[UserService] Error updating user preferences:", error);
      return false;
    }
  }

  async subscribeToSource(sourceId: string): Promise<boolean> {
    try {
      console.log("[UserService] Subscribing to source:", sourceId);

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("[UserService] No authenticated user found");
        return false;
      }

      // Get current sources
      const userRef = doc(db, `newswithfriends/users/${userId}`);
      const userSnap = await getDoc(userRef);

      const currentSourceIds = userSnap.exists
        ? (userSnap.data() as NewsWithFriendsUser).sourceIds || []
        : [];

      if (!currentSourceIds.includes(sourceId)) {
        await updateDoc(userRef, {
          sourceIds: [...currentSourceIds, sourceId],
        });
      }

      return true;
    } catch (error) {
      console.error("[UserService] Error subscribing to source:", error);
      return false;
    }
  }

  async unsubscribeFromSource(sourceId: string): Promise<boolean> {
    try {
      console.log("[UserService] Unsubscribing from source:", sourceId);

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("[UserService] No authenticated user found");
        return false;
      }

      // Get current sources
      const userRef = doc(db, `newswithfriends/users/${userId}`);
      const userSnap = await getDoc(userRef);

      const currentSourceIds = userSnap.exists
        ? (userSnap.data() as NewsWithFriendsUser).sourceIds || []
        : [];

      const updatedSourceIds = currentSourceIds.filter((id) => id !== sourceId);
      await updateDoc(userRef, { sourceIds: updatedSourceIds });

      return true;
    } catch (error) {
      console.error("[UserService] Error unsubscribing from source:", error);
      return false;
    }
  }
}

export const userService = new UserService();

// Keep the standalone functions for backward compatibility
export async function getCurrentUser(): Promise<User | null> {
  return userService.getCurrentUser();
}

export async function updateUserSources(sourceIds: string[]): Promise<boolean> {
  return userService.updateUserSources(sourceIds);
}

export async function updateUserPreferences(
  preferences: UserPreferences
): Promise<boolean> {
  return userService.updateUserPreferences(preferences);
}

export async function subscribeToSource(sourceId: string): Promise<boolean> {
  return userService.subscribeToSource(sourceId);
}

export async function unsubscribeFromSource(
  sourceId: string
): Promise<boolean> {
  return userService.unsubscribeFromSource(sourceId);
}
