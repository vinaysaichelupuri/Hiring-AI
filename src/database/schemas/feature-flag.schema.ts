import mongoose, { Schema, Document } from "mongoose";

/**
 * MongoDB document interface for feature flags
 */
export interface IFeatureFlagDocument extends Document {
  key: string;
  description: string;
  enabled: boolean;
  overrides: {
    users: Map<string, boolean>;
    groups: Map<string, boolean>;
    regions?: Map<string, boolean>;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for feature flags
 */
const FeatureFlagSchema = new Schema<IFeatureFlagDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    overrides: {
      users: {
        type: Map,
        of: Boolean,
        default: new Map(),
      },
      groups: {
        type: Map,
        of: Boolean,
        default: new Map(),
      },
      regions: {
        type: Map,
        of: Boolean,
        default: new Map(),
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    collection: "featureflags",
  }
);

// Create compound indexes for efficient queries
FeatureFlagSchema.index({ "overrides.users": 1 });
FeatureFlagSchema.index({ "overrides.groups": 1 });
FeatureFlagSchema.index({ "overrides.regions": 1 });

/**
 * Mongoose model for feature flags
 */
export const FeatureFlagModel = mongoose.model<IFeatureFlagDocument>(
  "FeatureFlag",
  FeatureFlagSchema
);
