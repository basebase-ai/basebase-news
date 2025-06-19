import { tokenService } from "./token.service";

/**
 * A custom fetch wrapper that automatically adds the Authorization header
 * for API requests.
 * @param url The URL to fetch.
 * @param options The fetch options.
 * @returns A Promise that resolves to the Response.
 */
export async function fetchApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = tokenService.getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, remove the token and reload to trigger sign-in.
    console.error("API request unauthorized. Clearing token and reloading.");
    tokenService.removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
  }

  return response;
}
