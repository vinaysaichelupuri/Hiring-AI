import {
  validateFeatureKey,
  validateDescription,
  validateEnabledState,
  validateOverrideType,
  validateOverrideId,
  validateEvaluationContext,
} from "../../src/domain/validators";
import { ValidationError } from "../../src/domain/errors";

describe("Validators", () => {
  describe("validateFeatureKey", () => {
    it("should accept valid feature keys", () => {
      expect(() => validateFeatureKey("valid-key")).not.toThrow();
      expect(() => validateFeatureKey("valid_key")).not.toThrow();
      expect(() => validateFeatureKey("validKey123")).not.toThrow();
      expect(() => validateFeatureKey("VALID-KEY")).not.toThrow();
    });

    it("should reject empty keys", () => {
      expect(() => validateFeatureKey("")).toThrow(ValidationError);
      expect(() => validateFeatureKey("   ")).toThrow(ValidationError);
    });

    it("should reject keys with invalid characters", () => {
      expect(() => validateFeatureKey("invalid key")).toThrow(ValidationError);
      expect(() => validateFeatureKey("invalid@key")).toThrow(ValidationError);
      expect(() => validateFeatureKey("invalid.key")).toThrow(ValidationError);
      expect(() => validateFeatureKey("invalid/key")).toThrow(ValidationError);
    });

    it("should reject keys exceeding 100 characters", () => {
      const longKey = "a".repeat(101);
      expect(() => validateFeatureKey(longKey)).toThrow(ValidationError);
    });

    it("should reject non-string keys", () => {
      expect(() => validateFeatureKey(null as any)).toThrow(ValidationError);
      expect(() => validateFeatureKey(undefined as any)).toThrow(
        ValidationError
      );
      expect(() => validateFeatureKey(123 as any)).toThrow(ValidationError);
    });
  });

  describe("validateDescription", () => {
    it("should accept valid descriptions", () => {
      expect(() => validateDescription("Valid description")).not.toThrow();
      expect(() => validateDescription("")).not.toThrow();
      expect(() => validateDescription(undefined as any)).not.toThrow();
    });

    it("should reject descriptions exceeding 500 characters", () => {
      const longDesc = "a".repeat(501);
      expect(() => validateDescription(longDesc)).toThrow(ValidationError);
    });

    it("should reject non-string descriptions", () => {
      expect(() => validateDescription(123 as any)).toThrow(ValidationError);
      expect(() => validateDescription({} as any)).toThrow(ValidationError);
    });
  });

  describe("validateEnabledState", () => {
    it("should accept boolean values", () => {
      expect(() => validateEnabledState(true)).not.toThrow();
      expect(() => validateEnabledState(false)).not.toThrow();
    });

    it("should reject non-boolean values", () => {
      expect(() => validateEnabledState("true" as any)).toThrow(
        ValidationError
      );
      expect(() => validateEnabledState(1 as any)).toThrow(ValidationError);
      expect(() => validateEnabledState(null as any)).toThrow(ValidationError);
      expect(() => validateEnabledState(undefined as any)).toThrow(
        ValidationError
      );
    });
  });

  describe("validateOverrideType", () => {
    it("should accept valid override types", () => {
      expect(() => validateOverrideType("user")).not.toThrow();
      expect(() => validateOverrideType("group")).not.toThrow();
      expect(() => validateOverrideType("region")).not.toThrow();
    });

    it("should reject invalid override types", () => {
      expect(() => validateOverrideType("invalid" as any)).toThrow(
        ValidationError
      );
      expect(() => validateOverrideType("USER" as any)).toThrow(
        ValidationError
      );
      expect(() => validateOverrideType("" as any)).toThrow(ValidationError);
    });
  });

  describe("validateOverrideId", () => {
    it("should accept valid override IDs", () => {
      expect(() => validateOverrideId("user-123")).not.toThrow();
      expect(() => validateOverrideId("group_beta")).not.toThrow();
    });

    it("should reject empty IDs", () => {
      expect(() => validateOverrideId("")).toThrow(ValidationError);
      expect(() => validateOverrideId("   ")).toThrow(ValidationError);
    });

    it("should reject IDs exceeding 100 characters", () => {
      const longId = "a".repeat(101);
      expect(() => validateOverrideId(longId)).toThrow(ValidationError);
    });

    it("should reject non-string IDs", () => {
      expect(() => validateOverrideId(null as any)).toThrow(ValidationError);
      expect(() => validateOverrideId(123 as any)).toThrow(ValidationError);
    });
  });

  describe("validateEvaluationContext", () => {
    it("should accept valid contexts", () => {
      expect(() =>
        validateEvaluationContext({ userId: "user-123" })
      ).not.toThrow();
      expect(() =>
        validateEvaluationContext({ groupId: "group-1" })
      ).not.toThrow();
      expect(() =>
        validateEvaluationContext({ regionId: "us-west" })
      ).not.toThrow();
      expect(() =>
        validateEvaluationContext({
          userId: "user-123",
          groupId: "group-1",
          regionId: "us-west",
        })
      ).not.toThrow();
    });

    it("should reject empty contexts", () => {
      expect(() => validateEvaluationContext({})).toThrow(ValidationError);
    });

    it("should reject non-object contexts", () => {
      expect(() => validateEvaluationContext(null as any)).toThrow(
        ValidationError
      );
      expect(() => validateEvaluationContext("invalid" as any)).toThrow(
        ValidationError
      );
    });

    it("should validate individual context fields", () => {
      expect(() => validateEvaluationContext({ userId: "" })).toThrow(
        ValidationError
      );
      expect(() => validateEvaluationContext({ groupId: "   " })).toThrow(
        ValidationError
      );
      expect(() =>
        validateEvaluationContext({ regionId: "a".repeat(101) })
      ).toThrow(ValidationError);
    });
  });
});
