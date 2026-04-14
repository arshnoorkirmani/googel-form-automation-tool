import { NextResponse } from "next/server";

import { createRunId } from "@/lib/utils/id";
import { batchSubmissionSchema } from "@/modules/submission/batch.schema";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { batchAutomationRunner } from "@/server/automation/batch-runner";
import { conflictError } from "@/server/errors/app-error";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { runQueue } from "@/server/runs/run-queue";
import { batchStore } from "@/server/runs/batch-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const operator = await requireOperatorContext();

    if (authSetupManager.getActiveSession(operator.operatorId)) {
      throw conflictError(
        "Login setup is still in progress. Finish the auth setup flow before starting a run."
      );
    }

    const authStatus = await authService.getStatus(operator, true);
    if (authStatus.state !== "VALID") {
      throw conflictError(
        authStatus.reason ??
          "Re-auth required. Complete login setup before starting a run."
      );
    }

    const payload = await request.json();
    const submission = batchSubmissionSchema.parse(payload);
    const batchId = createRunId();
    const batchRun = batchStore.create(batchId, submission, operator.operatorId);
    await batchHistoryRepository.upsert(batchRun);

    runQueue.enqueue(async () => {
      try {
        await batchAutomationRunner.execute(batchId, submission, operator);
      } catch {
        // Run state and history are already persisted by the runner.
      }
    });

    return NextResponse.json({ batchRun }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
