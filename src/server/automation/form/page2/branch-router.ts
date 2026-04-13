import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { handleCallBackBranch } from "@/server/automation/form/page2/call-back.handler";
import { handleFollowUpBranch } from "@/server/automation/form/page2/follow-up.handler";
import { handleInterestedBranch } from "@/server/automation/form/page2/interested.handler";
import { handleNotInterestedBranch } from "@/server/automation/form/page2/not-interested.handler";

export async function fillBranchPage(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  switch (submission.callStatus) {
    case "Interested":
      await handleInterestedBranch(page, submission);
      return;
    case "Follow Up":
      await handleFollowUpBranch(page, submission);
      return;
    case "Call Back":
      await handleCallBackBranch(page, submission);
      return;
    case "Not Interested":
      await handleNotInterestedBranch(page, submission);
      return;
    default:
      throw new Error(
        `Call Status "${submission.callStatus}" is not supported in the MVP.`
      );
  }
}
