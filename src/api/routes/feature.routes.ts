import { Router } from "express";
import { FeatureController } from "../controllers/feature.controller";
import { asyncHandler } from "../middleware/error.middleware";

/**
 * Create feature flag routes
 */
export function createFeatureRoutes(controller: FeatureController): Router {
  const router = Router();

  // Create a new feature flag
  router.post("/", asyncHandler(controller.createFeature));

  // Get all feature flags
  router.get("/", asyncHandler(controller.getAllFeatures));

  // Get a specific feature flag
  router.get("/:key", asyncHandler(controller.getFeature));

  // Update feature global state
  router.put("/:key", asyncHandler(controller.updateFeature));

  // Evaluate a feature flag
  router.post("/:key/evaluate", asyncHandler(controller.evaluateFeature));

  // Add or update an override
  router.post("/:key/overrides", asyncHandler(controller.addOverride));

  // Remove an override
  router.delete(
    "/:key/overrides/:type/:id",
    asyncHandler(controller.removeOverride)
  );

  // Delete a feature flag
  router.delete("/:key", asyncHandler(controller.deleteFeature));

  return router;
}
