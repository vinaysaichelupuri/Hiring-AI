/**
 * Core domain types for the feature flag system
 */

/**
 * Override types supported by the system
 */
export type OverrideType = "user" | "group" | "region";

/**
 * Feature flag overrides organized by type
 */
export interface FeatureOverrides {
  users: Map<string, boolean>;
  groups: Map<string, boolean>;
  regions?: Map<string, boolean>; // Phase 2
}

/**
 * Core feature flag entity
 */
export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean; // Global default state
  overrides: FeatureOverrides;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Context for evaluating a feature flag
 */
export interface EvaluationContext {
  userId?: string;
  groupId?: string;
  regionId?: string; // Phase 2
}

/**
 * Result of a feature evaluation
 */
export interface EvaluationResult {
  key: string;
  enabled: boolean;
  reason:
    | "user-override"
    | "group-override"
    | "region-override"
    | "global-default";
}

/**
 * Request to create a new feature flag
 */
export interface CreateFeatureRequest {
  key: string;
  description: string;
  enabled: boolean;
}

/**
 * Request to update a feature's global state
 */
export interface UpdateFeatureRequest {
  enabled: boolean;
}

/**
 * Request to add or update an override
 */
export interface AddOverrideRequest {
  type: OverrideType;
  id: string;
  enabled: boolean;
}

/**
 * Feature flag data transfer object (for API responses)
 */
export interface FeatureFlagDTO {
  key: string;
  description: string;
  enabled: boolean;
  overrides: {
    users: Record<string, boolean>;
    groups: Record<string, boolean>;
    regions?: Record<string, boolean>;
  };
  createdAt?: string;
  updatedAt?: string;
}
