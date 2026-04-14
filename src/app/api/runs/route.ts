import { NextResponse } from "next/server";

import { createRunId } from "@/lib/utils/id";
import { submissionSchema } from "@/modules/submission/submission.schema";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { automationRunner } from "@/server/automation/automation-runner";
import { conflictError } from "@/server/errors/app-error";
import { historyRepository } from "@/server/history/history-repository";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { runQueue } from "@/server/runs/run-queue";
import { runStore } from "@/server/runs/run-store";

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
    const submission = submissionSchema.parse(payload);
    const runId = createRunId();
    const run = runStore.create(runId, submission, operator.operatorId);
    await historyRepository.append(run);

    runQueue.enqueue(async () => {
      try {
        await automationRunner.execute(runId, submission, operator);
      } catch {
        // Run state and history are already persisted by the runner.
      }
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
