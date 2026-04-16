import {
  buildLogStreamReference,
  buildMongoArtifactReference,
  formatArtifactReference,
  resolveArtifactUrl
} from "@/lib/utils/artifact-reference";

describe("artifact reference helpers", () => {
  it("builds and resolves mongodb artifact references", () => {
    const reference = buildMongoArtifactReference("artifact-123", "success image.png");

    expect(reference).toBe("mongo/artifact-123/success-image.png");
    expect(resolveArtifactUrl(reference)).toBe(
      "/api/artifacts/mongo/artifact-123/success-image.png"
    );
    expect(formatArtifactReference(reference)).toBe("success-image.png");
  });

  it("builds and resolves log stream references", () => {
    const reference = buildLogStreamReference("run_123");

    expect(reference).toBe("logs/run_123.jsonl");
    expect(resolveArtifactUrl(reference)).toBe("/api/artifacts/logs/run_123.jsonl");
    expect(formatArtifactReference(reference)).toBe("run_123.jsonl");
  });

  it("converts legacy local artifact paths to the proxy route", () => {
    expect(
      resolveArtifactUrl(
        "D:\\Project\\automate-googel-form\\storage\\artifacts\\run-1\\file.png"
      )
    ).toBe("/api/artifacts/run-1/file.png");
  });
});
