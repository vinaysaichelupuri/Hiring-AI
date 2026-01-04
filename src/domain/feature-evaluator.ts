import { FeatureFlag, EvaluationContext, EvaluationResult } from "./types";

/**
 * Feature flag evaluation engine
 * Implements the hierarchical override logic: user → group → region → global
 */
export class FeatureEvaluator {
  /**
   * Evaluates a feature flag for a given context
   * Returns the enabled state based on the override hierarchy
   */
  evaluate(flag: FeatureFlag, context: EvaluationContext): EvaluationResult {
    // 1. Check user-specific override (highest priority)
    if (context.userId && flag.overrides.users.has(context.userId)) {
      return {
        key: flag.key,
        enabled: flag.overrides.users.get(context.userId)!,
        reason: "user-override",
      };
    }

    // 2. Check group-specific override
    if (context.groupId && flag.overrides.groups.has(context.groupId)) {
      return {
        key: flag.key,
        enabled: flag.overrides.groups.get(context.groupId)!,
        reason: "group-override",
      };
    }

    // 3. Check region-specific override (Phase 2)
    if (context.regionId && flag.overrides.regions?.has(context.regionId)) {
      return {
        key: flag.key,
        enabled: flag.overrides.regions.get(context.regionId)!,
        reason: "region-override",
      };
    }

    // 4. Return global default state (lowest priority)
    return {
      key: flag.key,
      enabled: flag.enabled,
      reason: "global-default",
    };
  }

  /**
   * Evaluates multiple feature flags for a given context
   * Useful for bulk evaluation operations
   */
  evaluateMultiple(
    flags: FeatureFlag[],
    context: EvaluationContext
  ): EvaluationResult[] {
    return flags.map((flag) => this.evaluate(flag, context));
  }
}
