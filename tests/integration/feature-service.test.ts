import { FeatureService } from "../../src/services/feature.service";
import { IFeatureRepository } from "../../src/repositories/feature.repository";
import { FeatureFlag, OverrideType } from "../../src/domain/types";
import { FeatureNotFoundError, ValidationError } from "../../src/domain/errors";

// Mock repository
class MockFeatureRepository implements IFeatureRepository {
  private features: Map<string, FeatureFlag> = new Map();

  async create(feature: FeatureFlag): Promise<FeatureFlag> {
    if (this.features.has(feature.key)) {
      throw new Error("Feature already exists");
    }
    this.features.set(feature.key, feature);
    return feature;
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    return this.features.get(key) || null;
  }

  async findAll(): Promise<FeatureFlag[]> {
    return Array.from(this.features.values());
  }

  async updateGlobalState(key: string, enabled: boolean): Promise<void> {
    const feature = this.features.get(key);
    if (!feature) throw new FeatureNotFoundError(key);
    feature.enabled = enabled;
  }

  async addOrUpdateOverride(
    key: string,
    type: OverrideType,
    id: string,
    enabled: boolean
  ): Promise<void> {
    const feature = this.features.get(key);
    if (!feature) throw new FeatureNotFoundError(key);
    feature.overrides[`${type}s` as keyof typeof feature.overrides]?.set(
      id,
      enabled
    );
  }

  async removeOverride(
    key: string,
    type: OverrideType,
    id: string
  ): Promise<void> {
    const feature = this.features.get(key);
    if (!feature) throw new FeatureNotFoundError(key);
    feature.overrides[`${type}s` as keyof typeof feature.overrides]?.delete(id);
  }

  async delete(key: string): Promise<void> {
    if (!this.features.has(key)) throw new FeatureNotFoundError(key);
    this.features.delete(key);
  }

  // Helper for tests
  clear() {
    this.features.clear();
  }
}

describe("FeatureService", () => {
  let service: FeatureService;
  let repository: MockFeatureRepository;

  beforeEach(() => {
    repository = new MockFeatureRepository();
    service = new FeatureService(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe("createFeature", () => {
    it("should create a feature with valid inputs", async () => {
      const feature = await service.createFeature(
        "test-feature",
        "Test description",
        false
      );

      expect(feature.key).toBe("test-feature");
      expect(feature.description).toBe("Test description");
      expect(feature.enabled).toBe(false);
      expect(feature.overrides.users).toBeInstanceOf(Map);
      expect(feature.overrides.groups).toBeInstanceOf(Map);
      expect(feature.overrides.regions).toBeInstanceOf(Map);
    });

    it("should validate feature key", async () => {
      await expect(
        service.createFeature("invalid key", "Description", true)
      ).rejects.toThrow(ValidationError);
    });

    it("should validate description", async () => {
      const longDesc = "a".repeat(501);
      await expect(
        service.createFeature("valid-key", longDesc, true)
      ).rejects.toThrow(ValidationError);
    });

    it("should validate enabled state", async () => {
      await expect(
        service.createFeature("valid-key", "Description", "true" as any)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getFeature", () => {
    it("should retrieve an existing feature", async () => {
      await service.createFeature("test-feature", "Description", true);
      const feature = await service.getFeature("test-feature");

      expect(feature.key).toBe("test-feature");
    });

    it("should throw FeatureNotFoundError for non-existent feature", async () => {
      await expect(service.getFeature("non-existent")).rejects.toThrow(
        FeatureNotFoundError
      );
    });

    it("should validate feature key", async () => {
      await expect(service.getFeature("invalid key")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("getAllFeatures", () => {
    it("should return all features", async () => {
      await service.createFeature("feature-1", "Description 1", true);
      await service.createFeature("feature-2", "Description 2", false);

      const features = await service.getAllFeatures();

      expect(features).toHaveLength(2);
      expect(features.map((f) => f.key)).toContain("feature-1");
      expect(features.map((f) => f.key)).toContain("feature-2");
    });

    it("should return empty array when no features exist", async () => {
      const features = await service.getAllFeatures();
      expect(features).toEqual([]);
    });
  });

  describe("evaluateFeature", () => {
    beforeEach(async () => {
      await service.createFeature("test-feature", "Description", false);
    });

    it("should evaluate feature with global default", async () => {
      const result = await service.evaluateFeature("test-feature", {
        userId: "user-123",
      });

      expect(result.key).toBe("test-feature");
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("global-default");
    });

    it("should evaluate feature with user override", async () => {
      await service.addOrUpdateOverride(
        "test-feature",
        "user",
        "user-123",
        true
      );

      const result = await service.evaluateFeature("test-feature", {
        userId: "user-123",
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("user-override");
    });

    it("should validate evaluation context", async () => {
      await expect(
        service.evaluateFeature("test-feature", {} as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw FeatureNotFoundError for non-existent feature", async () => {
      await expect(
        service.evaluateFeature("non-existent", { userId: "user-123" })
      ).rejects.toThrow(FeatureNotFoundError);
    });
  });

  describe("updateGlobalState", () => {
    beforeEach(async () => {
      await service.createFeature("test-feature", "Description", false);
    });

    it("should update global state", async () => {
      await service.updateGlobalState("test-feature", true);

      const feature = await service.getFeature("test-feature");
      expect(feature.enabled).toBe(true);
    });

    it("should validate enabled state", async () => {
      await expect(
        service.updateGlobalState("test-feature", "true" as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw FeatureNotFoundError for non-existent feature", async () => {
      await expect(
        service.updateGlobalState("non-existent", true)
      ).rejects.toThrow(FeatureNotFoundError);
    });
  });

  describe("addOrUpdateOverride", () => {
    beforeEach(async () => {
      await service.createFeature("test-feature", "Description", false);
    });

    it("should add user override", async () => {
      await service.addOrUpdateOverride(
        "test-feature",
        "user",
        "user-123",
        true
      );

      const feature = await service.getFeature("test-feature");
      expect(feature.overrides.users.get("user-123")).toBe(true);
    });

    it("should add group override", async () => {
      await service.addOrUpdateOverride(
        "test-feature",
        "group",
        "beta-testers",
        true
      );

      const feature = await service.getFeature("test-feature");
      expect(feature.overrides.groups.get("beta-testers")).toBe(true);
    });

    it("should add region override", async () => {
      await service.addOrUpdateOverride(
        "test-feature",
        "region",
        "us-west",
        true
      );

      const feature = await service.getFeature("test-feature");
      expect(feature.overrides.regions?.get("us-west")).toBe(true);
    });

    it("should update existing override", async () => {
      await service.addOrUpdateOverride(
        "test-feature",
        "user",
        "user-123",
        true
      );
      await service.addOrUpdateOverride(
        "test-feature",
        "user",
        "user-123",
        false
      );

      const feature = await service.getFeature("test-feature");
      expect(feature.overrides.users.get("user-123")).toBe(false);
    });

    it("should validate override type", async () => {
      await expect(
        service.addOrUpdateOverride(
          "test-feature",
          "invalid" as any,
          "id",
          true
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should validate override ID", async () => {
      await expect(
        service.addOrUpdateOverride("test-feature", "user", "", true)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("removeOverride", () => {
    beforeEach(async () => {
      await service.createFeature("test-feature", "Description", false);
      await service.addOrUpdateOverride(
        "test-feature",
        "user",
        "user-123",
        true
      );
    });

    it("should remove override", async () => {
      await service.removeOverride("test-feature", "user", "user-123");

      const feature = await service.getFeature("test-feature");
      expect(feature.overrides.users.has("user-123")).toBe(false);
    });

    it("should throw FeatureNotFoundError for non-existent feature", async () => {
      await expect(
        service.removeOverride("non-existent", "user", "user-123")
      ).rejects.toThrow(FeatureNotFoundError);
    });
  });

  describe("deleteFeature", () => {
    beforeEach(async () => {
      await service.createFeature("test-feature", "Description", false);
    });

    it("should delete feature", async () => {
      await service.deleteFeature("test-feature");

      await expect(service.getFeature("test-feature")).rejects.toThrow(
        FeatureNotFoundError
      );
    });

    it("should throw FeatureNotFoundError for non-existent feature", async () => {
      await expect(service.deleteFeature("non-existent")).rejects.toThrow(
        FeatureNotFoundError
      );
    });
  });
});
