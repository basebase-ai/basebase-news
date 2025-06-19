const TOKEN_KEY = "news_with_friends_auth_token";

/**
 * Manages the authentication token in localStorage.
 */
export const tokenService = {
  /**
   * Retrieves the token from localStorage.
   * @returns The token string, or null if not found.
   */
  getToken: (): string | null => {
    if (typeof window === "undefined") {
      console.log(
        "[tokenService] getToken called on server side, returning null"
      );
      return null;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    console.log("[tokenService] getToken called:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });
    return token;
  },

  /**
   * Saves the token to localStorage.
   * @param token The token string to save.
   */
  setToken: (token: string): void => {
    if (typeof window === "undefined") {
      console.log("[tokenService] setToken called on server side, ignoring");
      return;
    }

    console.log("[tokenService] setToken called:", {
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
    });

    localStorage.setItem(TOKEN_KEY, token);

    // Verify it was stored
    const stored = localStorage.getItem(TOKEN_KEY);
    console.log("[tokenService] Token storage verification:", {
      stored: !!stored,
      matches: stored === token,
    });
  },

  /**
   * Removes the token from localStorage.
   */
  removeToken: (): void => {
    if (typeof window === "undefined") {
      console.log("[tokenService] removeToken called on server side, ignoring");
      return;
    }

    const hadToken = !!localStorage.getItem(TOKEN_KEY);
    console.log("[tokenService] removeToken called:", {
      hadToken,
    });

    localStorage.removeItem(TOKEN_KEY);

    // Verify it was removed
    const stillExists = !!localStorage.getItem(TOKEN_KEY);
    console.log("[tokenService] Token removal verification:", {
      stillExists,
    });
  },
};
