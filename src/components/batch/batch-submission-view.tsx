"use client"

import { useState } from "react";
import { BatchSubmissionForm } from "./batch-submission-form";
import { BatchProgressPanel } from "./batch-progress-panel";

export function BatchSubmissionView() {
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // We hide UI manually to preserve unsubmitted form data.
  return (
    <div className="space-y-6">
      <div style={{ display: activeBatchId ? "none" : "block" }}>
        <BatchSubmissionForm 
          onBatchCreated={(batch) => setActiveBatchId(batch.batchId)} 
        />
      </div>

      {activeBatchId && (
        <BatchProgressPanel 
          batchId={activeBatchId} 
          onBack={() => setActiveBatchId(null)} 
        />
      )}
    </div>
  );
}
