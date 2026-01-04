/**
 * Custom error classes for the feature flag system
 */

/**
 * Base error class for feature flag errors
 */
export class FeatureFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a feature flag is not found
 */
export class FeatureNotFoundError extends FeatureFlagError {
  constructor(key: string) {
    super(`Feature flag '${key}' not found`);
  }
}

/**
 * Thrown when attempting to create a duplicate feature flag
 */
export class DuplicateFeatureError extends FeatureFlagError {
  constructor(key: string) {
    super(`Feature flag '${key}' already exists`);
  }
}

/**
 * Thrown when an invalid override operation is attempted
 */
export class InvalidOverrideError extends FeatureFlagError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends FeatureFlagError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when database operations fail
 */
export class DatabaseError extends FeatureFlagError {
  constructor(message: string, public originalError?: Error) {
    super(message);
  }
}
