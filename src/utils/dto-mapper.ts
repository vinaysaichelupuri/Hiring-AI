import { FeatureFlag, FeatureFlagDTO } from "../domain/types";

/**
 * Utility functions for converting between domain entities and DTOs
 */

/**
 * Convert a FeatureFlag domain entity to a DTO for API responses
 */
export function toDTO(feature: FeatureFlag): FeatureFlagDTO {
  return {
    key: feature.key,
    description: feature.description,
    enabled: feature.enabled,
    overrides: {
      users: Object.fromEntries(feature.overrides.users),
      groups: Object.fromEntries(feature.overrides.groups),
      regions: feature.overrides.regions
        ? Object.fromEntries(feature.overrides.regions)
        : undefined,
    },
    createdAt: feature.createdAt?.toISOString(),
    updatedAt: feature.updatedAt?.toISOString(),
  };
}

/**
 * Convert multiple FeatureFlag entities to DTOs
 */
export function toDTOs(features: FeatureFlag[]): FeatureFlagDTO[] {
  return features.map(toDTO);
}
