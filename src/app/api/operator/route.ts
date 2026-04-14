import { NextResponse } from "next/server";

import {
  buildOperatorContext,
  getOptionalOperatorContext,
  OPERATOR_COOKIE_NAME
} from "@/server/operator/operator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

export async function GET() {
  const operator = await getOptionalOperatorContext();
  return NextResponse.json({ operator });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const operator = buildOperatorContext(payload.email ?? "");

    const response = NextResponse.json({ operator });
    response.cookies.set(OPERATOR_COOKIE_NAME, operator.email, buildCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save operator identity."
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OPERATOR_COOKIE_NAME, "", {
    ...buildCookieOptions(),
    maxAge: 0
  });
  return response;
}
