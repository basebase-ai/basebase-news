import { GraphQLClient, gql } from "graphql-request";

const BASEBASE_ENDPOINT = "https://app.basebase.us/graphql";

const BASEBASE_API_KEY = process.env.BASEBASE_API_KEY;

interface RequestCodeResponse {
  requestCode: boolean;
}

interface VerifyCodeResponse {
  verifyCode: string;
}

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
      console.log("[BasebaseAuthService] Sending requestCode with:", {
        phone,
        name,
      });

      const response = await this.client.request<RequestCodeResponse>(
        REQUEST_CODE,
        {
          phone,
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
      const response = await this.client.request<VerifyCodeResponse>(
        VERIFY_CODE,
        {
          phone,
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
