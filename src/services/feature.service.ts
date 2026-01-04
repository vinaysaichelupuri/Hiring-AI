import {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  OverrideType,
} from "../domain/types";
import { FeatureEvaluator } from "../domain/feature-evaluator";
import { IFeatureRepository } from "../repositories/feature.repository";
import {
  validateFeatureKey,
  validateDescription,
  validateEnabledState,
  validateOverrideType,
  validateOverrideId,
  validateEvaluationContext,
} from "../domain/validators";
import { FeatureNotFoundError } from "../domain/errors";

/**
 * Service layer for feature flag business logic
 */
export class FeatureService {
  private evaluator: FeatureEvaluator;

  constructor(private repository: IFeatureRepository) {
    this.evaluator = new FeatureEvaluator();
  }

  /**
   * Create a new feature flag
   */
  async createFeature(
    key: string,
    description: string,
    enabled: boolean
  ): Promise<FeatureFlag> {
    // Validate inputs
    validateFeatureKey(key);
    validateDescription(description);
    validateEnabledState(enabled);

    // Create feature with empty overrides
    const feature: FeatureFlag = {
      key,
      description,
      enabled,
      overrides: {
        users: new Map(),
        groups: new Map(),
        regions: new Map(),
      },
    };

    return await this.repository.create(feature);
  }

  /**
   * Get a feature flag by key
   */
  async getFeature(key: string): Promise<FeatureFlag> {
    validateFeatureKey(key);

    const feature = await this.repository.findByKey(key);
    if (!feature) {
      throw new FeatureNotFoundError(key);
    }

    return feature;
  }

  /**
   * Get all feature flags
   */
  async getAllFeatures(): Promise<FeatureFlag[]> {
    return await this.repository.findAll();
  }

  /**
   * Evaluate a feature flag for a given context
   */
  async evaluateFeature(
    key: string,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    validateFeatureKey(key);
    validateEvaluationContext(context);

    const feature = await this.getFeature(key);
    return this.evaluator.evaluate(feature, context);
  }

  /**
   * Update the global enabled state of a feature
   */
  async updateGlobalState(key: string, enabled: boolean): Promise<void> {
    validateFeatureKey(key);
    validateEnabledState(enabled);

    await this.repository.updateGlobalState(key, enabled);
  }

  /**
   * Add or update an override for a feature
   */
  async addOrUpdateOverride(
    key: string,
    type: OverrideType,
    id: string,
    enabled: boolean
  ): Promise<void> {
    validateFeatureKey(key);
    validateOverrideType(type);
    validateOverrideId(id);
    validateEnabledState(enabled);

    // Verify feature exists
    await this.getFeature(key);

    await this.repository.addOrUpdateOverride(key, type, id, enabled);
  }

  /**
   * Remove an override from a feature
   */
  async removeOverride(
    key: string,
    type: OverrideType,
    id: string
  ): Promise<void> {
    validateFeatureKey(key);
    validateOverrideType(type);
    validateOverrideId(id);

    // Verify feature exists
    await this.getFeature(key);

    await this.repository.removeOverride(key, type, id);
  }

  /**
   * Delete a feature flag
   */
  async deleteFeature(key: string): Promise<void> {
    validateFeatureKey(key);
    await this.repository.delete(key);
  }
}
