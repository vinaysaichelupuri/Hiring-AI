import express, { Request, Response } from "express";
import cors from "cors";
import Database from "./database/database";
import { RedisCache } from "./cache/redis-cache";
import { FeatureRepository } from "./repositories/feature.repository";
import { FeatureService } from "./services/feature.service";
import { FeatureController } from "./api/controllers/feature.controller";
import { createFeatureRoutes } from "./api/routes/feature.routes";
import { errorHandler } from "./api/middleware/error.middleware";

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize cache and repository
const redisCache = new RedisCache();
const featureRepository = new FeatureRepository(redisCache);
const featureService = new FeatureService(featureRepository);
const featureController = new FeatureController(featureService);

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Feature Flag System API",
    version: "1.0.0",
    endpoints: {
      features: "/api/features",
      health: "/health",
    },
  });
});

app.get("/health", async (req: Request, res: Response) => {
  const cacheStats = await redisCache.getStats();
  res.json({
    status: "healthy",
    database: Database.getConnectionStatus() ? "connected" : "disconnected",
    cache: {
      enabled: cacheStats.enabled,
      connected: cacheStats.connected,
    },
    timestamp: new Date().toISOString(),
  });
});

// Feature flag routes
app.use("/api/features", createFeatureRoutes(featureController));

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await Database.connect();

    // Connect to cache (non-blocking - will gracefully degrade if fails)
    await redisCache.connect();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await redisCache.disconnect();
  await Database.disconnect();
  process.exit(0);
});

startServer();
