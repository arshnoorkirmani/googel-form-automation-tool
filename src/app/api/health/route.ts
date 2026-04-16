import { NextResponse } from "next/server";

import { configService } from "@/server/config/config-service";
import { toAppError } from "@/server/errors/app-error";
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
        mongodbLogs: config.persistence.mongodbLogsEnabled ? "enabled" : "disabled",
        screenshots:
          config.persistence.mongodbScreenshotsEnabled ||
          config.persistence.screenshotsEnabled
            ? "enabled"
            : "disabled",
        runReports:
          config.persistence.mongodbRunReportsEnabled ||
          config.persistence.runReportsEnabled
            ? "enabled"
            : "disabled"
      }
    });
  } catch (error) {
    const appError = toAppError(error);

    return NextResponse.json(
      {
        status: "degraded",
        error: appError.message,
        retryable: appError.retryable,
        checks: {
          mongodb: "unavailable"
        }
      },
      { status: 503 }
    );
  }
}
