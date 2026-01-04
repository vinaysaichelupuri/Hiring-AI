import { Request, Response, NextFunction } from "express";
import {
  FeatureFlagError,
  FeatureNotFoundError,
  DuplicateFeatureError,
  ValidationError,
  DatabaseError,
} from "../../domain/errors";

/**
 * Global error handling middleware
 * Maps domain errors to appropriate HTTP responses
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("Error:", error);

  // Feature not found
  if (error instanceof FeatureNotFoundError) {
    res.status(404).json({
      error: "Not Found",
      message: error.message,
    });
    return;
  }

  // Duplicate feature
  if (error instanceof DuplicateFeatureError) {
    res.status(409).json({
      error: "Conflict",
      message: error.message,
    });
    return;
  }

  // Validation error
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: "Bad Request",
      message: error.message,
    });
    return;
  }

  // Database error
  if (error instanceof DatabaseError) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "A database error occurred",
    });
    return;
  }

  // Generic feature flag error
  if (error instanceof FeatureFlagError) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
    return;
  }

  // Unknown error
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
