import { NextResponse } from "next/server";

import { configService } from "@/server/config/config-service";
import { createErrorResponse } from "@/server/http/route-response";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await configService.getConfig();
    const operator = await getOptionalOperatorContext();

    return NextResponse.json({
      config: {
        appName: config.appName,
        formUrl: config.formUrl,
        defaultMode: config.defaultMode,
        maxRetries: config.maxRetries,
        maxBatchRows: config.maxBatchRows,
        debug: config.debug,
        operatorConfigured: Boolean(operator)
      }
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
