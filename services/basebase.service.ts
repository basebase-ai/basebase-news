import {
  requestCode,
  verifyCode,
  getAuthState,
  isAuthenticated,
  signOut,
} from "basebase";

/**
 * Request SMS verification code
 */
export async function requestCodeSMS(
  name: string,
  phone: string
): Promise<boolean> {
  try {
    console.log("[BaseBase] Calling requestCode with:", { name, phone });
    console.log(
      "[BaseBase] API Key configured:",
      !!process.env.BASEBASE_API_KEY
    );
    console.log(
      "[BaseBase] API Key length:",
      process.env.BASEBASE_API_KEY?.length || 0
    );

    const response = await requestCode(name, phone);
    console.log("[BaseBase] requestCode response:", response);
    console.log("[BaseBase] response type:", typeof response);
    console.log("[BaseBase] response keys:", Object.keys(response || {}));

    // Handle different possible response structures
    if (response && typeof response === "object") {
      const responseAny = response as any;
      // Check for success property
      if (responseAny.success !== undefined) {
        return responseAny.success;
      }
      // Check for status property
      if (responseAny.status !== undefined) {
        return responseAny.status === "success" || responseAny.status === "ok";
      }
      // Check for userId indicating successful user creation/lookup
      if (responseAny.userId) {
        return true;
      }
      // If response exists but no explicit success indicator, assume success
      return true;
    }

    // If we get here, assume success since no error was thrown
    return true;
  } catch (error) {
    console.error("[BaseBase] Error requesting code:", error);
    console.error("[BaseBase] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as any).code || "Unknown",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });
    throw error;
  }
}

/**
 * Verify SMS code - SDK handles token storage automatically
 */
export async function verifyCodeSMS(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    console.log("[BaseBase] Calling verifyCode with:", { phone, code });
    const result = await verifyCode(phone, code, process.env.BASEBASE_API_KEY!);
    console.log("[BaseBase] verifyCode response:", result);
    console.log(
      "[BaseBase] Authentication state after verify:",
      getAuthState()
    );

    // SDK automatically stores the token - just return success
    return !!result.token;
  } catch (error) {
    console.error("[BaseBase] Error verifying code:", error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  return isAuthenticated();
}

/**
 * Get current authentication state
 */
export function getAuthenticationState() {
  return getAuthState();
}

/**
 * Sign out user
 */
export function signOutUser(): void {
  signOut();
}
