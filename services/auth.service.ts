import jwt from "jsonwebtoken";
import { User, IUser } from "../models/user.model";

interface AuthPayload {
  userId: string;
  isAdmin: boolean;
}

/**
 * Verifies the JWT from the Authorization header and returns the user payload.
 * Throws an error if the token is invalid or the user is not found.
 * @param request The incoming Request object.
 * @returns The user's ID and admin status.
 */
export const verifyAuth = async (request: Request): Promise<AuthPayload> => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    throw new Error("No token provided");
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
  if (!decoded || !decoded.userId) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
    isAdmin: decoded.isAdmin || false,
  };
};
