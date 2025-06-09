import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    status: "ok",
    message: "Signed out successfully",
  });
  response.cookies.delete("auth");
  return response;
}
