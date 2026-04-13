import {
  extractBlackbuckEmail,
  interpretSessionSignals
} from "@/server/auth/session-validator";

describe("session validator signals", () => {
  it("detects valid form access", () => {
    const result = interpretSessionSignals(
      "https://docs.google.com/forms/d/e/example/viewform",
      "Email FO Number Call Status OMC user@blackbuck.com"
    );

    expect(result.state).toBe("VALID");
    expect(result.detectedEmail).toBe("user@blackbuck.com");
  });

  it("detects re-auth requirements", () => {
    const result = interpretSessionSignals(
      "https://accounts.google.com/signin/v2",
      "Sign in to continue"
    );

    expect(result.state).toBe("REAUTH_REQUIRED");
  });

  it("extracts only blackbuck emails", () => {
    expect(
      extractBlackbuckEmail("Signed in as fleet.owner@blackbuck.com")
    ).toBe("fleet.owner@blackbuck.com");
    expect(extractBlackbuckEmail("someone@example.com")).toBeUndefined();
  });
});
