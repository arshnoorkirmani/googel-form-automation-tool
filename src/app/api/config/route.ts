import { NextResponse } from "next/server";

import { configService } from "@/server/config/config-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await configService.getConfig();

  return NextResponse.json({
    config: {
      appName: config.appName,
      formUrl: config.formUrl,
      defaultMode: config.defaultMode,
      maxRetries: config.maxRetries,
      maxBatchRows: config.maxBatchRows,
      debug: config.debug
    }
  });
}
