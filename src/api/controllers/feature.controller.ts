import { Request, Response } from "express";
import { FeatureService } from "../../services/feature.service";
import { toDTO, toDTOs } from "../../utils/dto-mapper";
import {
  CreateFeatureRequest,
  AddOverrideRequest,
  EvaluationContext,
} from "../../domain/types";

/**
 * Controller for feature flag API endpoints
 */
export class FeatureController {
  constructor(private featureService: FeatureService) {}

  /**
   * POST /api/features
   * Create a new feature flag
   */
  createFeature = async (req: Request, res: Response): Promise<void> => {
    const { key, description, enabled } = req.body as CreateFeatureRequest;

    const feature = await this.featureService.createFeature(
      key,
      description,
      enabled
    );

    res.status(201).json(toDTO(feature));
  };

  /**
   * GET /api/features
   * Get all feature flags
   */
  getAllFeatures = async (req: Request, res: Response): Promise<void> => {
    const features = await this.featureService.getAllFeatures();

    res.status(200).json(toDTOs(features));
  };

  /**
   * GET /api/features/:key
   * Get a specific feature flag
   */
  getFeature = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;

    const feature = await this.featureService.getFeature(key);

    res.status(200).json(toDTO(feature));
  };

  /**
   * PUT /api/features/:key
   * Update the global state of a feature flag
   */
  updateFeature = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const { enabled } = req.body;

    await this.featureService.updateGlobalState(key, enabled);

    res.status(200).json({
      message: "Feature updated successfully",
      key,
      enabled,
    });
  };

  /**
   * POST /api/features/:key/evaluate
   * Evaluate a feature flag for a given context
   */
  evaluateFeature = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const context = req.body as EvaluationContext;

    const result = await this.featureService.evaluateFeature(key, context);

    res.status(200).json(result);
  };

  /**
   * POST /api/features/:key/overrides
   * Add or update an override
   */
  addOverride = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const { type, id, enabled } = req.body as AddOverrideRequest;

    await this.featureService.addOrUpdateOverride(key, type, id, enabled);

    res.status(200).json({
      message: "Override added successfully",
      key,
      override: { type, id, enabled },
    });
  };

  /**
   * DELETE /api/features/:key/overrides/:type/:id
   * Remove an override
   */
  removeOverride = async (req: Request, res: Response): Promise<void> => {
    const { key, type, id } = req.params;

    await this.featureService.removeOverride(key, type as any, id);

    res.status(200).json({
      message: "Override removed successfully",
      key,
      override: { type, id },
    });
  };

  /**
   * DELETE /api/features/:key
   * Delete a feature flag
   */
  deleteFeature = async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;

    await this.featureService.deleteFeature(key);

    res.status(200).json({
      message: "Feature deleted successfully",
      key,
    });
  };
}
