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
  console.log("[fetchApi] Making request:", {
    url,
    method: options.method || "GET",
    hasBody: !!options.body,
    bodyType: typeof options.body,
  });

  const token = tokenService.getToken();
  console.log("[fetchApi] Token status:", {
    hasToken: !!token,
    tokenLength: token?.length || 0,
  });

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    console.log("[fetchApi] Authorization header added");
  } else {
    console.log("[fetchApi] No token available for Authorization header");
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  console.log(
    "[fetchApi] Request headers:",
    Object.fromEntries(headers.entries())
  );

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log("[fetchApi] Response received:", {
    url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
  });

  if (response.status === 401) {
    // If unauthorized, the token may be invalid. The user asked not to clear it.
    console.error(
      "[fetchApi] 401 Unauthorized - not clearing token as per user request"
    );
    // tokenService.removeToken();
    // console.log("[fetchApi] Token removed from storage");
    // if (typeof window !== "undefined") {
    //   window.location.href = "/auth/signin";
    // }
  }

  return response;
}
