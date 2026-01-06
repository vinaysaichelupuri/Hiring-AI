import request from "supertest";
import express, { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { FeatureRepository } from "../../src/repositories/feature.repository";
import { FeatureService } from "../../src/services/feature.service";
import { FeatureController } from "../../src/api/controllers/feature.controller";
import { createFeatureRoutes } from "../../src/api/routes/feature.routes";
import { errorHandler } from "../../src/api/middleware/error.middleware";
import { RedisCache } from "../../src/cache/redis-cache";

describe("Feature Flag API E2E Tests", () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let cache: RedisCache;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create mock cache (disabled)
    cache = new RedisCache();
    // Don't connect to Redis for tests

    // Setup app
    app = express();
    app.use(express.json());

    const repository = new FeatureRepository(cache);
    const service = new FeatureService(repository);
    const controller = new FeatureController(service);

    app.use("/api/features", createFeatureRoutes(controller));
    app.use(errorHandler);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear database between tests
    await mongoose.connection.dropDatabase();
  });

  describe("POST /api/features", () => {
    it("should create a new feature", async () => {
      const response = await request(app)
        .post("/api/features")
        .send({
          key: "test-feature",
          description: "Test description",
          enabled: false,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        key: "test-feature",
        description: "Test description",
        enabled: false,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it("should return 400 for invalid feature key", async () => {
      const response = await request(app)
        .post("/api/features")
        .send({
          key: "invalid key",
          description: "Test",
          enabled: true,
        })
        .expect(400);

      expect(response.body.error).toBe("Bad Request");
    });

  });

  describe("GET /api/features", () => {
    it("should return all features", async () => {
      await request(app).post("/api/features").send({
        key: "feature-1",
        description: "First",
        enabled: true,
      });

      await request(app).post("/api/features").send({
        key: "feature-2",
        description: "Second",
        enabled: false,
      });

      const response = await request(app).get("/api/features").expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((f: any) => f.key)).toContain("feature-1");
      expect(response.body.map((f: any) => f.key)).toContain("feature-2");
    });

    it("should return empty array when no features exist", async () => {
      const response = await request(app).get("/api/features").expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/features/:key", () => {
    it("should return a specific feature", async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: true,
      });

      const response = await request(app)
        .get("/api/features/test-feature")
        .expect(200);

      expect(response.body.key).toBe("test-feature");
    });

    it("should return 404 for non-existent feature", async () => {
      const response = await request(app)
        .get("/api/features/non-existent")
        .expect(404);

      expect(response.body.error).toBe("Not Found");
    });
  });

  describe("PUT /api/features/:key", () => {
    it("should update feature global state", async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: false,
      });

      const response = await request(app)
        .put("/api/features/test-feature")
        .send({ enabled: true })
        .expect(200);

      expect(response.body.message).toBe("Feature updated successfully");
      expect(response.body.enabled).toBe(true);

      // Verify update
      const feature = await request(app).get("/api/features/test-feature");
      expect(feature.body.enabled).toBe(true);
    });

    it("should return 404 for non-existent feature", async () => {
      await request(app)
        .put("/api/features/non-existent")
        .send({ enabled: true })
        .expect(404);
    });
  });

  describe("POST /api/features/:key/evaluate", () => {
    beforeEach(async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: false,
      });
    });

    it("should evaluate with global default", async () => {
      const response = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({ userId: "user-123" })
        .expect(200);

      expect(response.body).toEqual({
        key: "test-feature",
        enabled: false,
        reason: "global-default",
      });
    });

    it("should evaluate with user override", async () => {
      await request(app).post("/api/features/test-feature/overrides").send({
        type: "user",
        id: "user-123",
        enabled: true,
      });

      const response = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({ userId: "user-123" })
        .expect(200);

      expect(response.body).toEqual({
        key: "test-feature",
        enabled: true,
        reason: "user-override",
      });
    });

    it("should evaluate with group override", async () => {
      await request(app).post("/api/features/test-feature/overrides").send({
        type: "group",
        id: "beta-testers",
        enabled: true,
      });

      const response = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({ groupId: "beta-testers" })
        .expect(200);

      expect(response.body.reason).toBe("group-override");
    });

    it("should evaluate with region override", async () => {
      await request(app).post("/api/features/test-feature/overrides").send({
        type: "region",
        id: "us-west",
        enabled: true,
      });

      const response = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({ regionId: "us-west" })
        .expect(200);

      expect(response.body.reason).toBe("region-override");
    });

    it("should follow override hierarchy", async () => {
      // Add all overrides
      await request(app).post("/api/features/test-feature/overrides").send({
        type: "user",
        id: "user-123",
        enabled: true,
      });
      await request(app).post("/api/features/test-feature/overrides").send({
        type: "group",
        id: "beta-testers",
        enabled: false,
      });

      // User override should win
      const response = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({
          userId: "user-123",
          groupId: "beta-testers",
        })
        .expect(200);

      expect(response.body.reason).toBe("user-override");
      expect(response.body.enabled).toBe(true);
    });

    it("should return 400 for empty context", async () => {
      await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/features/:key/overrides", () => {
    beforeEach(async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: false,
      });
    });

    it("should add user override", async () => {
      const response = await request(app)
        .post("/api/features/test-feature/overrides")
        .send({
          type: "user",
          id: "user-123",
          enabled: true,
        })
        .expect(200);

      expect(response.body.message).toBe("Override added successfully");
    });

    it("should add group override", async () => {
      await request(app)
        .post("/api/features/test-feature/overrides")
        .send({
          type: "group",
          id: "beta-testers",
          enabled: true,
        })
        .expect(200);
    });

    it("should add region override", async () => {
      await request(app)
        .post("/api/features/test-feature/overrides")
        .send({
          type: "region",
          id: "us-west",
          enabled: true,
        })
        .expect(200);
    });

    it("should return 400 for invalid override type", async () => {
      await request(app)
        .post("/api/features/test-feature/overrides")
        .send({
          type: "invalid",
          id: "test",
          enabled: true,
        })
        .expect(400);
    });
  });

  describe("DELETE /api/features/:key/overrides/:type/:id", () => {
    beforeEach(async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: false,
      });

      await request(app).post("/api/features/test-feature/overrides").send({
        type: "user",
        id: "user-123",
        enabled: true,
      });
    });

    it("should remove override", async () => {
      const response = await request(app)
        .delete("/api/features/test-feature/overrides/user/user-123")
        .expect(200);

      expect(response.body.message).toBe("Override removed successfully");

      // Verify removal
      const evalResponse = await request(app)
        .post("/api/features/test-feature/evaluate")
        .send({ userId: "user-123" });

      expect(evalResponse.body.reason).toBe("global-default");
    });
  });

  describe("DELETE /api/features/:key", () => {
    it("should delete feature", async () => {
      await request(app).post("/api/features").send({
        key: "test-feature",
        description: "Test",
        enabled: false,
      });

      const response = await request(app)
        .delete("/api/features/test-feature")
        .expect(200);

      expect(response.body.message).toBe("Feature deleted successfully");

      // Verify deletion
      await request(app).get("/api/features/test-feature").expect(404);
    });

    it("should return 404 for non-existent feature", async () => {
      await request(app).delete("/api/features/non-existent").expect(404);
    });
  });
});
