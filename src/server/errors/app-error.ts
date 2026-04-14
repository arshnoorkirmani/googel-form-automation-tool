import {
  MongoNetworkError,
  MongoParseError,
  MongoServerSelectionError
} from "mongodb";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRECONDITION_REQUIRED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

export type ApiErrorPayload = {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
  };
};

type AppErrorOptions = {
  cause?: unknown;
  retryable?: boolean;
};

type ErrorWithCode = Error & {
  code?: string;
  syscall?: string;
  hostname?: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(
    code: ApiErrorCode,
    statusCode: number,
    message: string,
    options: AppErrorOptions = {}
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = options.retryable ?? false;

    if ("cause" in Error.prototype || options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function badRequestError(message: string, cause?: unknown): AppError {
  return new AppError("BAD_REQUEST", 400, message, { cause });
}

export function notFoundError(message: string, cause?: unknown): AppError {
  return new AppError("NOT_FOUND", 404, message, { cause });
}

export function conflictError(message: string, cause?: unknown): AppError {
  return new AppError("CONFLICT", 409, message, { cause });
}

export function preconditionRequiredError(
  message: string,
  cause?: unknown
): AppError {
  return new AppError("PRECONDITION_REQUIRED", 428, message, { cause });
}

export function dependencyUnavailableError(
  message: string,
  cause?: unknown,
  retryable = true
): AppError {
  return new AppError("DEPENDENCY_UNAVAILABLE", 503, message, {
    cause,
    retryable
  });
}

export function internalServerError(
  message = "The server could not complete the request.",
  cause?: unknown
): AppError {
  return new AppError("INTERNAL_SERVER_ERROR", 500, message, { cause });
}

export function toApiErrorPayload(error: AppError): ApiErrorPayload {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable
    }
  };
}

function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return (error as ErrorWithCode).code;
}

function isSrvLookupIssue(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const typedError = error as ErrorWithCode;
  return (
    typedError.syscall === "querySrv" ||
    typedError.message.includes("querySrv") ||
    typedError.message.includes("_mongodb._tcp.")
  );
}

function isMongoDependencyError(error: unknown): boolean {
  if (
    error instanceof MongoServerSelectionError ||
    error instanceof MongoNetworkError ||
    error instanceof MongoParseError
  ) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const code = getErrorCode(error);
  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }

  return (
    error.message.includes("Mongo") ||
    error.message.includes("MONGODB_URI") ||
    error.message.includes("Server selection timed out")
  );
}

function formatMongoDependencyMessage(error: Error): string {
  const typedError = error as ErrorWithCode;

  if (typedError.message.includes("MONGODB_URI is required")) {
    return "MongoDB is not configured. Set MONGODB_URI before using persisted auth, history, or batch data.";
  }

  if (typedError instanceof MongoParseError) {
    return "MongoDB configuration is invalid. Check the MONGODB_URI format and credentials.";
  }

  if (isSrvLookupIssue(error)) {
    return "MongoDB SRV lookup failed. This environment could not resolve the Atlas SRV record. Use a direct mongodb:// host list or fix outbound DNS resolution.";
  }

  if (typedError.code === "ENOTFOUND") {
    return "MongoDB host lookup failed. Verify the configured hostname and outbound DNS access.";
  }

  if (typedError.code === "ECONNREFUSED") {
    return "MongoDB refused the connection. Verify the cluster host list, network access rules, and database availability.";
  }

  if (typedError.code === "ETIMEDOUT") {
    return "MongoDB connection timed out. Verify outbound network access and cluster reachability.";
  }

  return "MongoDB is temporarily unavailable. Retry shortly, or verify the configured connection string and network access.";
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue?.message ?? "The request payload is invalid.";
    return badRequestError(message, error);
  }

  if (error instanceof SyntaxError) {
    return badRequestError("The request body is not valid JSON.", error);
  }

  if (error instanceof Error && error.name === "ReAuthRequiredError") {
    return conflictError(error.message, error);
  }

  if (error instanceof Error && isMongoDependencyError(error)) {
    return dependencyUnavailableError(
      formatMongoDependencyMessage(error),
      error
    );
  }

  if (error instanceof Error) {
    return internalServerError(error.message || undefined, error);
  }

  return internalServerError(undefined, error);
}

export function toServerErrorMessage(error: unknown): string {
  return toAppError(error).message;
}
