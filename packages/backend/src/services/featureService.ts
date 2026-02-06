import { AgileConfig, DEFAULT_AGILE_CONFIG } from '../types/agile';
import { createError } from '../middleware/errorHandler';

export class FeatureService {
  /**
   * Check if a specific feature is enabled for a board
   */
  static isFeatureEnabled(
    agileConfig: AgileConfig | null | undefined,
    feature: keyof AgileConfig['features']
  ): boolean {
    if (!agileConfig) return false;
    return agileConfig.features[feature] || false;
  }

  /**
   * Get all enabled features for a board
   */
  static getEnabledFeatures(
    agileConfig: AgileConfig | null | undefined
  ): (keyof AgileConfig['features'])[] {
    if (!agileConfig) return [];
    
    return Object.entries(agileConfig.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature as keyof AgileConfig['features']);
  }

  /**
   * Validate that a feature is enabled before allowing operations
   */
  static requireFeature(
    agileConfig: AgileConfig | null | undefined,
    feature: keyof AgileConfig['features'],
    operation: string
  ): void {
    if (!this.isFeatureEnabled(agileConfig, feature)) {
      throw createError(
        `${operation} requires the '${feature}' feature to be enabled`,
        400
      );
    }
  }

  /**
   * Validate multiple features are enabled
   */
  static requireFeatures(
    agileConfig: AgileConfig | null | undefined,
    features: (keyof AgileConfig['features'])[],
    operation: string
  ): void {
    const missingFeatures = features.filter(
      feature => !this.isFeatureEnabled(agileConfig, feature)
    );

    if (missingFeatures.length > 0) {
      throw createError(
        `${operation} requires the following features to be enabled: ${missingFeatures.join(', ')}`,
        400
      );
    }
  }

  /**
   * Check if story points are required for estimation
   */
  static isEstimationRequired(agileConfig: AgileConfig | null | undefined): boolean {
    if (!agileConfig) return false;
    return agileConfig.requireEstimation && this.isFeatureEnabled(agileConfig, 'storyPoints');
  }

  /**
   * Validate story points value against configured scale
   */
  static validateStoryPoints(
    agileConfig: AgileConfig | null | undefined,
    storyPoints: number
  ): void {
    if (!agileConfig) return;
    
    const scale = agileConfig.storyPointsScale || DEFAULT_AGILE_CONFIG.storyPointsScale;
    if (!scale.includes(storyPoints)) {
      throw createError(
        `Story points must be one of: ${scale.join(', ')}`,
        400
      );
    }
  }

  /**
   * Get feature dependencies
   */
  static getFeatureDependencies(): Record<keyof AgileConfig['features'], (keyof AgileConfig['features'])[]> {
    return {
      sprints: ['storyPoints'],
      storyPoints: [],
      epics: [],
      timeTracking: [],
      burndownCharts: ['sprints', 'storyPoints'],
      customWorkflows: [],
      labels: [],
      priorities: [],
    };
  }

  /**
   * Validate feature dependencies are met
   */
  static validateFeatureDependencies(
    agileConfig: AgileConfig | null | undefined,
    feature: keyof AgileConfig['features']
  ): void {
    if (!agileConfig) return;
    
    const dependencies = this.getFeatureDependencies()[feature];
    const missingDependencies = dependencies.filter(
      dep => !this.isFeatureEnabled(agileConfig, dep)
    );

    if (missingDependencies.length > 0) {
      throw createError(
        `Feature '${feature}' requires the following dependencies: ${missingDependencies.join(', ')}`,
        400
      );
    }
  }

  /**
   * Filter data based on enabled features
   */
  static filterDataByFeatures<T extends Record<string, any>>(
    data: T,
    agileConfig: AgileConfig | null | undefined,
    featureMap: Partial<Record<keyof T, keyof AgileConfig['features']>>
  ): Partial<T> {
    const filtered: Partial<T> = { ...data };

    Object.entries(featureMap).forEach(([dataKey, feature]) => {
      if (!this.isFeatureEnabled(agileConfig, feature as keyof AgileConfig['features'])) {
        delete filtered[dataKey as keyof T];
      }
    });

    return filtered;
  }

  /**
   * Get UI visibility configuration for features
   */
  static getUIVisibility(
    agileConfig: AgileConfig | null | undefined
  ): Record<keyof AgileConfig['features'], boolean> {
    const defaultVisibility: Record<keyof AgileConfig['features'], boolean> = {
      sprints: false,
      storyPoints: false,
      epics: false,
      timeTracking: false,
      burndownCharts: false,
      customWorkflows: false,
      labels: false,
      priorities: false,
    };

    if (!agileConfig) return defaultVisibility;

    return {
      sprints: this.isFeatureEnabled(agileConfig, 'sprints'),
      storyPoints: this.isFeatureEnabled(agileConfig, 'storyPoints'),
      epics: this.isFeatureEnabled(agileConfig, 'epics'),
      timeTracking: this.isFeatureEnabled(agileConfig, 'timeTracking'),
      burndownCharts: this.isFeatureEnabled(agileConfig, 'burndownCharts'),
      customWorkflows: this.isFeatureEnabled(agileConfig, 'customWorkflows'),
      labels: this.isFeatureEnabled(agileConfig, 'labels'),
      priorities: this.isFeatureEnabled(agileConfig, 'priorities'),
    };
  }

  /**
   * Validate card data based on enabled features
   */
  static validateCardData(
    agileConfig: AgileConfig | null | undefined,
    cardData: {
      storyPoints?: number;
      priority?: string;
      issueType?: string;
      originalEstimate?: number;
    }
  ): void {
    // Validate story points if provided
    if (cardData.storyPoints !== undefined) {
      this.requireFeature(agileConfig, 'storyPoints', 'Story points assignment');
      this.validateStoryPoints(agileConfig, cardData.storyPoints);
    }

    // Validate priority if provided
    if (cardData.priority !== undefined) {
      this.requireFeature(agileConfig, 'priorities', 'Priority assignment');
    }

    // Validate time tracking fields
    if (cardData.originalEstimate !== undefined) {
      this.requireFeature(agileConfig, 'timeTracking', 'Time estimation');
    }
  }

  /**
   * Validate sprint operations
   */
  static validateSprintOperation(
    agileConfig: AgileConfig | null | undefined,
    operation: string
  ): void {
    this.requireFeature(agileConfig, 'sprints', operation);
    
    // Sprint operations also require story points for capacity planning
    if (operation.includes('capacity') || operation.includes('planning')) {
      this.requireFeature(agileConfig, 'storyPoints', operation);
    }
  }

  /**
   * Validate epic operations
   */
  static validateEpicOperation(
    agileConfig: AgileConfig | null | undefined,
    operation: string
  ): void {
    this.requireFeature(agileConfig, 'epics', operation);
  }

  /**
   * Validate time tracking operations
   */
  static validateTimeTrackingOperation(
    agileConfig: AgileConfig | null | undefined,
    operation: string
  ): void {
    this.requireFeature(agileConfig, 'timeTracking', operation);
  }

  /**
   * Validate burndown chart operations
   */
  static validateBurndownOperation(
    agileConfig: AgileConfig | null | undefined,
    operation: string
  ): void {
    this.requireFeatures(agileConfig, ['sprints', 'storyPoints'], operation);
  }

  /**
   * Get allowed operations based on enabled features
   */
  static getAllowedOperations(
    agileConfig: AgileConfig | null | undefined
  ): {
    canCreateSprints: boolean;
    canAssignStoryPoints: boolean;
    canCreateEpics: boolean;
    canTrackTime: boolean;
    canViewBurndown: boolean;
    canUseCustomWorkflows: boolean;
    canUseLabels: boolean;
    canSetPriorities: boolean;
  } {
    return {
      canCreateSprints: this.isFeatureEnabled(agileConfig, 'sprints'),
      canAssignStoryPoints: this.isFeatureEnabled(agileConfig, 'storyPoints'),
      canCreateEpics: this.isFeatureEnabled(agileConfig, 'epics'),
      canTrackTime: this.isFeatureEnabled(agileConfig, 'timeTracking'),
      canViewBurndown: this.isFeatureEnabled(agileConfig, 'burndownCharts'),
      canUseCustomWorkflows: this.isFeatureEnabled(agileConfig, 'customWorkflows'),
      canUseLabels: this.isFeatureEnabled(agileConfig, 'labels'),
      canSetPriorities: this.isFeatureEnabled(agileConfig, 'priorities'),
    };
  }
}