import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

export class EdgeAuthService {
  private static instance: EdgeAuthService;
  private readonly JWT_SECRET: Uint8Array;

  private constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    this.JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
  }

  public static getInstance(): EdgeAuthService {
    if (!EdgeAuthService.instance) {
      EdgeAuthService.instance = new EdgeAuthService();
    }
    return EdgeAuthService.instance;
  }

  public async generateToken(userId: string): Promise<string> {
    const jwt = await new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("365d")
      .sign(this.JWT_SECRET);
    return jwt;
  }

  public async verifyToken(token: string): Promise<{ userId: string }> {
    try {
      const { payload } = await jwtVerify(token, this.JWT_SECRET);
      return { userId: payload.userId as string };
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Extracts Bearer token from an Authorization header.
   */
  public extractTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7); // Remove "Bearer " prefix
  }

  /**
   * Validates a JWT token.
   */
  public async validateToken(token: string): Promise<boolean> {
    try {
      await this.verifyToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const edgeAuthService = EdgeAuthService.getInstance();
