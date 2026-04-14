import { NextResponse } from "next/server";

import { configService } from "@/server/config/config-service";
import { pingMongo } from "@/server/database/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await configService.getConfig();
    await pingMongo();

    return NextResponse.json({
      status: "ok",
      checks: {
        mongodb: "connected",
        interactiveAuthSetup: config.auth.interactiveSetupEnabled
          ? "enabled"
          : "disabled",
        fileLogs: config.persistence.logFilesEnabled ? "enabled" : "disabled",
        screenshots: config.persistence.screenshotsEnabled ? "enabled" : "disabled",
        runReports: config.persistence.runReportsEnabled ? "enabled" : "disabled"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        error:
          error instanceof Error ? error.message : "Health checks could not complete."
      },
      { status: 503 }
    );
  }
}
