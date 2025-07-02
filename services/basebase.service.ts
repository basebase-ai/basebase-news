import { GraphQLClient, gql } from "graphql-request";

const BASEBASE_ENDPOINT = "https://app.basebase.us/graphql";

// Define response types
interface GetUserResponse {
  data: {
    document: {
      id: string;
      data: any;
    };
  };
}

interface GetAllUsersResponse {
  data: {
    documents: Array<{
      id: string;
      data: any;
    }>;
  };
}

interface UpdateUserFriendsResponse {
  data: {
    updateDocument: {
      id: string;
      data: any;
    };
  };
}

// GraphQL Queries and Mutations
const GET_USER = gql`
  query GetUser($id: ID!) {
    document(collection: "users", id: $id) {
      id
      data
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    documents(collection: "users") {
      id
      data
    }
  }
`;

const UPDATE_USER_FRIENDS = gql`
  mutation UpdateUserFriends($id: ID!, $friends: [ID!]!) {
    updateDocument(collection: "users", id: $id, data: { friends: $friends }) {
      id
      data
    }
  }
`;

class BasebaseService {
  private client: GraphQLClient;
  private authenticatedClient: GraphQLClient | null = null;

  constructor() {
    this.client = new GraphQLClient(BASEBASE_ENDPOINT);
  }

  private setAuthToken(token: string) {
    this.authenticatedClient = new GraphQLClient(BASEBASE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  setToken(token: string) {
    this.setAuthToken(token);
  }

  async getUser(id: string) {
    if (!this.authenticatedClient) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await this.authenticatedClient.request<GetUserResponse>(
        GET_USER,
        { id }
      );
      return response.data.document;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getAllUsers() {
    if (!this.authenticatedClient) {
      throw new Error("Not authenticated");
    }

    try {
      const response =
        await this.authenticatedClient.request<GetAllUsersResponse>(
          GET_ALL_USERS
        );
      return response.data.documents;
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  async updateUserFriends(id: string, friends: string[]): Promise<any> {
    if (!this.authenticatedClient) {
      throw new Error("Not authenticated");
    }

    try {
      const response =
        await this.authenticatedClient.request<UpdateUserFriendsResponse>(
          UPDATE_USER_FRIENDS,
          { id, friends }
        );
      return response.data.updateDocument;
    } catch (error) {
      console.error("Error updating user friends:", error);
      throw error;
    }
  }

  async graphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.authenticatedClient) {
      throw new Error("Not authenticated");
    }

    try {
      return await this.authenticatedClient.request<T>(query, variables);
    } catch (error) {
      console.error("Error making GraphQL request:", error);
      throw error;
    }
  }
}

export const basebaseService = new BasebaseService();
