import { GraphQLClient, gql } from "graphql-request";

const BASEBASE_ENDPOINT = "https://app.basebase.us/graphql";

const BASEBASE_API_KEY = process.env.BASEBASE_API_KEY;

interface RequestCodeResponse {
  requestCode: boolean;
}

interface VerifyCodeResponse {
  verifyCode: string;
}

const canonicalizePhone = (phone: string): string => {
  if (!phone) {
    return "";
  }
  // If phone already starts with + and the rest of the string contains only digits, assume it's in E.164 format
  if (phone.startsWith("+") && /^\d+$/.test(phone.slice(1))) {
    return phone;
  }

  // Otherwise, remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // If the number has 10 digits (US number), prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If the number has 11 digits and starts with 1 (US number), prepend +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // For other cases, just prepend +
  // This is a simplistic approach and might not cover all international cases
  return `+${digits}`;
};

// GraphQL Queries and Mutations
const REQUEST_CODE = gql`
  mutation RequestCode($phone: String!, $name: String!) {
    requestCode(phone: $phone, name: $name)
  }
`;

const VERIFY_CODE = gql`
  mutation VerifyCode($phone: String!, $code: String!, $appApiKey: String!) {
    verifyCode(phone: $phone, code: $code, appApiKey: $appApiKey)
  }
`;

class BasebaseAuthService {
  private client: GraphQLClient;

  constructor() {
    const appApiKey = process.env.BASEBASE_API_KEY;
    if (!appApiKey) {
      throw new Error("BASEBASE_API_KEY environment variable is required");
    }

    this.client = new GraphQLClient(BASEBASE_ENDPOINT, {});
  }

  async requestCode(phone: string, name: string): Promise<boolean> {
    try {
      const canonicalizedPhone = canonicalizePhone(phone);
      console.log("[BasebaseAuthService] Sending requestCode with:", {
        phone: canonicalizedPhone,
        name,
      });

      const response = await this.client.request<RequestCodeResponse>(
        REQUEST_CODE,
        {
          phone: canonicalizedPhone,
          name,
        }
      );

      console.log(
        "[BasebaseAuthService] RequestCode response:",
        JSON.stringify(response, null, 2)
      );
      return response.requestCode;
    } catch (error: any) {
      console.error("[BasebaseAuthService] Error requesting code:", error);
      if (error.response) {
        console.error(
          "[BasebaseAuthService] Error response:",
          JSON.stringify(error.response, null, 2)
        );
      }
      throw error;
    }
  }

  async verifyCode(phone: string, code: string): Promise<string> {
    try {
      const canonicalizedPhone = canonicalizePhone(phone);
      const response = await this.client.request<VerifyCodeResponse>(
        VERIFY_CODE,
        {
          phone: canonicalizedPhone,
          code,
          appApiKey: BASEBASE_API_KEY,
        }
      );
      return response.verifyCode;
    } catch (error) {
      console.error("[BasebaseAuthService] Error verifying code:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const basebaseAuthService = new BasebaseAuthService();
