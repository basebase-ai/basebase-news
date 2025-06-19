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
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Saves the token to localStorage.
   * @param token The token string to save.
   */
  setToken: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Removes the token from localStorage.
   */
  removeToken: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};
