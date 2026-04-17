import { NextResponse } from "next/server";

import { createRunId } from "@/lib/utils/id";
import { submissionSchema } from "@/modules/submission/submission.schema";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { automationRunner } from "@/server/automation/automation-runner";
import { historyRepository } from "@/server/history/history-repository";
import { runQueue } from "@/server/runs/run-queue";
import { runStore } from "@/server/runs/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (authSetupManager.getActiveSession()) {
      return NextResponse.json(
        {
          error:
            "Login setup is still in progress. Finish the auth setup flow before starting a run."
        },
        { status: 409 }
      );
    }

    const authStatus = await authService.getStatus(true);
    if (authStatus.state !== "VALID") {
      return NextResponse.json(
        {
          error:
            authStatus.reason ??
            "Re-auth required. Complete login setup before starting a run."
        },
        { status: 409 }
      );
    }

    const payload = await request.json();
    const submission = submissionSchema.parse(payload);
    const runId = createRunId();
    const run = runStore.create(runId, submission, authStatus.detectedEmail);
    await historyRepository.append(run);

    runQueue.enqueue(async () => {
      try {
        await automationRunner.execute(runId, submission);
      } catch {
        // Run state and history are already persisted by the runner.
      }
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create run."
      },
      { status: 400 }
    );
  }
}
