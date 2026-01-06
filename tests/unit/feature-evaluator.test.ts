import { FeatureEvaluator } from "../../src/domain/feature-evaluator";
import { FeatureFlag, EvaluationContext } from "../../src/domain/types";

describe("FeatureEvaluator", () => {
  let evaluator: FeatureEvaluator;

  beforeEach(() => {
    evaluator = new FeatureEvaluator();
  });

  const createFeature = (
    enabled: boolean,
    overrides: {
      users?: Record<string, boolean>;
      groups?: Record<string, boolean>;
      regions?: Record<string, boolean>;
    } = {}
  ): FeatureFlag => ({
    key: "test-feature",
    description: "Test feature",
    enabled,
    overrides: {
      users: new Map(Object.entries(overrides.users || {})),
      groups: new Map(Object.entries(overrides.groups || {})),
      regions: new Map(Object.entries(overrides.regions || {})),
    },
  });

  describe("evaluate", () => {
    describe("global default", () => {
      it("should return global default when no overrides exist", () => {
        const feature = createFeature(true);
        const context: EvaluationContext = { userId: "user-123" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: true,
          reason: "global-default",
        });
      });

      it("should return false when feature is disabled globally", () => {
        const feature = createFeature(false);
        const context: EvaluationContext = { userId: "user-123" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: false,
          reason: "global-default",
        });
      });
    });

    describe("user override", () => {
      it("should use user override when present", () => {
        const feature = createFeature(false, {
          users: { "user-123": true },
        });
        const context: EvaluationContext = { userId: "user-123" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: true,
          reason: "user-override",
        });
      });

      it("should return false when user override is false", () => {
        const feature = createFeature(true, {
          users: { "user-123": false },
        });
        const context: EvaluationContext = { userId: "user-123" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: false,
          reason: "user-override",
        });
      });

      it("should fall back to global when user override does not match", () => {
        const feature = createFeature(true, {
          users: { "user-456": true },
        });
        const context: EvaluationContext = { userId: "user-123" };

        const result = evaluator.evaluate(feature, context);

        expect(result.reason).toBe("global-default");
      });
    });

    describe("group override", () => {
      it("should use group override when present", () => {
        const feature = createFeature(false, {
          groups: { "beta-testers": true },
        });
        const context: EvaluationContext = { groupId: "beta-testers" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: true,
          reason: "group-override",
        });
      });

      it("should prioritize user override over group override", () => {
        const feature = createFeature(false, {
          users: { "user-123": false },
          groups: { "beta-testers": true },
        });
        const context: EvaluationContext = {
          userId: "user-123",
          groupId: "beta-testers",
        };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: false,
          reason: "user-override",
        });
      });
    });

    describe("region override", () => {
      it("should use region override when present", () => {
        const feature = createFeature(false, {
          regions: { "us-west": true },
        });
        const context: EvaluationContext = { regionId: "us-west" };

        const result = evaluator.evaluate(feature, context);

        expect(result).toEqual({
          key: "test-feature",
          enabled: true,
          reason: "region-override",
        });
      });

      it("should prioritize group override over region override", () => {
        const feature = createFeature(false, {
          groups: { "beta-testers": true },
          regions: { "us-west": false },
        });
        const context: EvaluationContext = {
          groupId: "beta-testers",
          regionId: "us-west",
        };

        const result = evaluator.evaluate(feature, context);

        expect(result.reason).toBe("group-override");
      });
    });

    describe("hierarchy", () => {
      it("should follow user > group > region > global hierarchy", () => {
        const feature = createFeature(false, {
          users: { "user-123": true },
          groups: { "beta-testers": false },
          regions: { "us-west": false },
        });

        // User override wins
        let result = evaluator.evaluate(feature, {
          userId: "user-123",
          groupId: "beta-testers",
          regionId: "us-west",
        });
        expect(result.reason).toBe("user-override");
        expect(result.enabled).toBe(true);

        // Group override wins when no user override
        result = evaluator.evaluate(feature, {
          userId: "user-456",
          groupId: "beta-testers",
          regionId: "us-west",
        });
        expect(result.reason).toBe("group-override");
        expect(result.enabled).toBe(false);

        // Region override wins when no user or group override
        result = evaluator.evaluate(feature, {
          userId: "user-456",
          groupId: "other-group",
          regionId: "us-west",
        });
        expect(result.reason).toBe("region-override");
        expect(result.enabled).toBe(false);

        // Global default when no overrides match
        result = evaluator.evaluate(feature, {
          userId: "user-456",
          groupId: "other-group",
          regionId: "eu-west",
        });
        expect(result.reason).toBe("global-default");
        expect(result.enabled).toBe(false);
      });
    });
  });

  describe("evaluateMultiple", () => {
    it("should evaluate multiple features", () => {
      const features: FeatureFlag[] = [
        createFeature(true),
        createFeature(false, { users: { "user-123": true } }),
        createFeature(true, { groups: { "beta-testers": false } }),
      ];

      const context: EvaluationContext = {
        userId: "user-123",
        groupId: "beta-testers",
      };

      const results = evaluator.evaluateMultiple(features, context);

      expect(results).toHaveLength(3);
      expect(results[0].reason).toBe("global-default");
      expect(results[0].enabled).toBe(true);
      expect(results[1].reason).toBe("user-override");
      expect(results[1].enabled).toBe(true);
      expect(results[2].reason).toBe("group-override");
      expect(results[2].enabled).toBe(false);
    });

    it("should handle empty feature list", () => {
      const results = evaluator.evaluateMultiple([], { userId: "user-123" });
      expect(results).toEqual([]);
    });
  });
});
