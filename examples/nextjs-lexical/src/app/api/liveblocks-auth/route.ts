import { USER_INFO } from "@/database";
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error - Hidden config option
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Get the current user's unique id from your database
  const userIndex = Math.floor(Math.random() * USER_INFO.length);

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: USER_INFO[userIndex],
  });

  const { room } = await request.json();

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
