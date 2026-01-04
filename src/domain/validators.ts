import { ValidationError } from "./errors";
import { OverrideType } from "./types";

/**
 * Validation utilities for feature flag inputs
 */

/**
 * Validates a feature flag key format
 * Keys must be alphanumeric with hyphens and underscores only
 */
export function validateFeatureKey(key: string): void {
  if (!key || typeof key !== "string") {
    throw new ValidationError("Feature key is required and must be a string");
  }

  if (key.trim().length === 0) {
    throw new ValidationError("Feature key cannot be empty");
  }

  const keyPattern = /^[a-zA-Z0-9_-]+$/;
  if (!keyPattern.test(key)) {
    throw new ValidationError(
      "Feature key must contain only alphanumeric characters, hyphens, and underscores"
    );
  }

  if (key.length > 100) {
    throw new ValidationError("Feature key must not exceed 100 characters");
  }
}

/**
 * Validates a feature description
 */
export function validateDescription(description: string): void {
  if (description !== undefined && typeof description !== "string") {
    throw new ValidationError("Description must be a string");
  }

  if (description && description.length > 500) {
    throw new ValidationError("Description must not exceed 500 characters");
  }
}

/**
 * Validates a boolean enabled state
 */
export function validateEnabledState(enabled: any): void {
  if (typeof enabled !== "boolean") {
    throw new ValidationError("Enabled state must be a boolean value");
  }
}

/**
 * Validates an override type
 */
export function validateOverrideType(
  type: string
): asserts type is OverrideType {
  const validTypes: OverrideType[] = ["user", "group", "region"];
  if (!validTypes.includes(type as OverrideType)) {
    throw new ValidationError(
      `Invalid override type '${type}'. Must be one of: ${validTypes.join(
        ", "
      )}`
    );
  }
}

/**
 * Validates an override ID
 */
export function validateOverrideId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Override ID is required and must be a string");
  }

  if (id.trim().length === 0) {
    throw new ValidationError("Override ID cannot be empty");
  }

  if (id.length > 100) {
    throw new ValidationError("Override ID must not exceed 100 characters");
  }
}

/**
 * Validates a complete feature creation request
 */
export function validateCreateFeatureRequest(data: any): void {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Invalid request body");
  }

  validateFeatureKey(data.key);
  validateDescription(data.description);
  validateEnabledState(data.enabled);
}

/**
 * Validates an evaluation context
 */
export function validateEvaluationContext(context: any): void {
  if (!context || typeof context !== "object") {
    throw new ValidationError("Evaluation context must be an object");
  }

  // At least one context field should be provided
  if (!context.userId && !context.groupId && !context.regionId) {
    throw new ValidationError(
      "Evaluation context must include at least one of: userId, groupId, regionId"
    );
  }

  // Validate individual fields if provided
  if (context.userId !== undefined) {
    validateOverrideId(context.userId);
  }

  if (context.groupId !== undefined) {
    validateOverrideId(context.groupId);
  }

  if (context.regionId !== undefined) {
    validateOverrideId(context.regionId);
  }
}
