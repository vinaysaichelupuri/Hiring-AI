import { FeatureFlag, OverrideType } from "../domain/types";
import {
  FeatureFlagModel,
  IFeatureFlagDocument,
} from "../database/schemas/feature-flag.schema";
import {
  DatabaseError,
  DuplicateFeatureError,
  FeatureNotFoundError,
} from "../domain/errors";

/**
 * Repository interface for feature flag data access
 */
export interface IFeatureRepository {
  create(feature: FeatureFlag): Promise<FeatureFlag>;
  findByKey(key: string): Promise<FeatureFlag | null>;
  findAll(): Promise<FeatureFlag[]>;
  updateGlobalState(key: string, enabled: boolean): Promise<void>;
  addOrUpdateOverride(
    key: string,
    type: OverrideType,
    id: string,
    enabled: boolean
  ): Promise<void>;
  removeOverride(key: string, type: OverrideType, id: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * MongoDB implementation of the feature repository
 */
export class FeatureRepository implements IFeatureRepository {
  /**
   * Convert MongoDB document to domain entity
   */
  private toDomain(doc: IFeatureFlagDocument): FeatureFlag {
    return {
      key: doc.key,
      description: doc.description,
      enabled: doc.enabled,
      overrides: {
        users: new Map(doc.overrides.users),
        groups: new Map(doc.overrides.groups),
        regions: doc.overrides.regions
          ? new Map(doc.overrides.regions)
          : new Map(),
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Create a new feature flag
   */
  async create(feature: FeatureFlag): Promise<FeatureFlag> {
    try {
      const doc = new FeatureFlagModel({
        key: feature.key,
        description: feature.description,
        enabled: feature.enabled,
        overrides: {
          users: feature.overrides.users,
          groups: feature.overrides.groups,
          regions: feature.overrides.regions || new Map(),
        },
      });

      const saved = await doc.save();
      return this.toDomain(saved);
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        throw new DuplicateFeatureError(feature.key);
      }
      throw new DatabaseError("Failed to create feature flag", error);
    }
  }

  /**
   * Find a feature flag by key
   */
  async findByKey(key: string): Promise<FeatureFlag | null> {
    try {
      const doc = await FeatureFlagModel.findOne({ key }).exec();
      return doc ? this.toDomain(doc) : null;
    } catch (error: any) {
      throw new DatabaseError("Failed to find feature flag", error);
    }
  }

  /**
   * Find all feature flags
   */
  async findAll(): Promise<FeatureFlag[]> {
    try {
      const docs = await FeatureFlagModel.find().sort({ key: 1 }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error: any) {
      throw new DatabaseError("Failed to retrieve feature flags", error);
    }
  }

  /**
   * Update the global enabled state of a feature
   */
  async updateGlobalState(key: string, enabled: boolean): Promise<void> {
    try {
      const result = await FeatureFlagModel.updateOne(
        { key },
        { $set: { enabled } }
      ).exec();

      if (result.matchedCount === 0) {
        throw new FeatureNotFoundError(key);
      }
    } catch (error: any) {
      if (error instanceof FeatureNotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to update feature state", error);
    }
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
    try {
      const overrideField = `overrides.${type}s.${id}`;
      const result = await FeatureFlagModel.updateOne(
        { key },
        { $set: { [overrideField]: enabled } }
      ).exec();

      if (result.matchedCount === 0) {
        throw new FeatureNotFoundError(key);
      }
    } catch (error: any) {
      if (error instanceof FeatureNotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to add override", error);
    }
  }

  /**
   * Remove an override from a feature
   */
  async removeOverride(
    key: string,
    type: OverrideType,
    id: string
  ): Promise<void> {
    try {
      const overrideField = `overrides.${type}s.${id}`;
      const result = await FeatureFlagModel.updateOne(
        { key },
        { $unset: { [overrideField]: "" } }
      ).exec();

      if (result.matchedCount === 0) {
        throw new FeatureNotFoundError(key);
      }
    } catch (error: any) {
      if (error instanceof FeatureNotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to remove override", error);
    }
  }

  /**
   * Delete a feature flag
   */
  async delete(key: string): Promise<void> {
    try {
      const result = await FeatureFlagModel.deleteOne({ key }).exec();

      if (result.deletedCount === 0) {
        throw new FeatureNotFoundError(key);
      }
    } catch (error: any) {
      if (error instanceof FeatureNotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to delete feature flag", error);
    }
  }
}
