export const dynamic = "force-dynamic";

import { BatchSubmissionView } from "@/components/batch/batch-submission-view";

export default function BatchPage() {
  return (
    <div className="space-y-6">
      <BatchSubmissionView />
    </div>
  );
}
