import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AppError,
  dependencyUnavailableError,
  toAppError
} from "@/server/errors/app-error";

describe("toAppError", () => {
  it("preserves existing AppError instances", () => {
    const error = dependencyUnavailableError("MongoDB is down.");

    expect(toAppError(error)).toBe(error);
  });

  it("maps zod validation failures to bad requests", () => {
    const schema = z.object({
      count: z.number()
    });

    const result = schema.safeParse({ count: "bad" });
    if (result.success) {
      throw new Error("Expected schema parsing to fail.");
    }

    const error = toAppError(result.error);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.statusCode).toBe(400);
  });

  it("maps invalid JSON errors to bad requests", () => {
    const error = toAppError(new SyntaxError("Unexpected token"));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("The request body is not valid JSON.");
  });

  it("maps mongo SRV lookup failures to dependency errors", () => {
    const cause = Object.assign(
      new Error("querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.net"),
      {
        code: "ECONNREFUSED",
        syscall: "querySrv",
        hostname: "_mongodb._tcp.cluster0.example.net"
      }
    );

    const error = toAppError(cause);
    expect(error.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain("SRV lookup failed");
  });

  it("wraps unknown failures as internal errors", () => {
    const error = toAppError(new Error("Unexpected boom"));

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.statusCode).toBe(500);
  });
});
