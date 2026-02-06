import { useMemo } from 'react';
import { AgileConfig } from '@/types';

export interface FeatureVisibility {
  sprints: boolean;
  storyPoints: boolean;
  epics: boolean;
  timeTracking: boolean;
  burndownCharts: boolean;
  customWorkflows: boolean;
  labels: boolean;
  priorities: boolean;
}

export interface FeatureOperations {
  canCreateSprints: boolean;
  canAssignStoryPoints: boolean;
  canCreateEpics: boolean;
  canTrackTime: boolean;
  canViewBurndown: boolean;
  canUseCustomWorkflows: boolean;
  canUseLabels: boolean;
  canSetPriorities: boolean;
  requiresEstimation: boolean;
}

/**
 * Hook to determine feature visibility and operations based on board's agile configuration
 */
export function useFeatureVisibility(agileConfig: AgileConfig | null | undefined) {
  const visibility = useMemo((): FeatureVisibility => {
    if (!agileConfig) {
      return {
        sprints: false,
        storyPoints: false,
        epics: false,
        timeTracking: false,
        burndownCharts: false,
        customWorkflows: false,
        labels: false,
        priorities: false,
      };
    }

    return {
      sprints: agileConfig.features.sprints || false,
      storyPoints: agileConfig.features.storyPoints || false,
      epics: agileConfig.features.epics || false,
      timeTracking: agileConfig.features.timeTracking || false,
      burndownCharts: agileConfig.features.burndownCharts || false,
      customWorkflows: agileConfig.features.customWorkflows || false,
      labels: agileConfig.features.labels || false,
      priorities: agileConfig.features.priorities || false,
    };
  }, [agileConfig]);

  const operations = useMemo((): FeatureOperations => {
    return {
      canCreateSprints: visibility.sprints,
      canAssignStoryPoints: visibility.storyPoints,
      canCreateEpics: visibility.epics,
      canTrackTime: visibility.timeTracking,
      canViewBurndown: visibility.burndownCharts && visibility.sprints && visibility.storyPoints,
      canUseCustomWorkflows: visibility.customWorkflows,
      canUseLabels: visibility.labels,
      canSetPriorities: visibility.priorities,
      requiresEstimation: agileConfig?.requireEstimation && visibility.storyPoints || false,
    };
  }, [visibility, agileConfig]);

  const isFeatureEnabled = (feature: keyof FeatureVisibility): boolean => {
    return visibility[feature];
  };

  const requireFeature = (feature: keyof FeatureVisibility, operation: string): void => {
    if (!visibility[feature]) {
      throw new Error(`${operation} requires the '${feature}' feature to be enabled`);
    }
  };

  const getStoryPointsScale = (): number[] => {
    return agileConfig?.storyPointsScale || [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  };

  const isValidStoryPoints = (points: number): boolean => {
    const scale = getStoryPointsScale();
    return scale.includes(points);
  };

  const getDefaultIssueType = (): string => {
    return agileConfig?.defaultIssueType || 'task';
  };

  const getSprintDuration = (): number => {
    return agileConfig?.sprintDuration || 14;
  };

  const getWorkingDaysPerWeek = (): number => {
    return agileConfig?.workingDaysPerWeek || 5;
  };

  return {
    visibility,
    operations,
    isFeatureEnabled,
    requireFeature,
    getStoryPointsScale,
    isValidStoryPoints,
    getDefaultIssueType,
    getSprintDuration,
    getWorkingDaysPerWeek,
  };
}

/**
 * Hook to get feature dependencies
 */
export function useFeatureDependencies() {
  const dependencies: Record<keyof FeatureVisibility, (keyof FeatureVisibility)[]> = {
    sprints: ['storyPoints'],
    storyPoints: [],
    epics: [],
    timeTracking: [],
    burndownCharts: ['sprints', 'storyPoints'],
    customWorkflows: [],
    labels: [],
    priorities: [],
  };

  const getDependencies = (feature: keyof FeatureVisibility): (keyof FeatureVisibility)[] => {
    return dependencies[feature] || [];
  };

  const getDependents = (feature: keyof FeatureVisibility): (keyof FeatureVisibility)[] => {
    return Object.entries(dependencies)
      .filter(([_, deps]) => deps.includes(feature))
      .map(([dependent, _]) => dependent as keyof FeatureVisibility);
  };

  const validateDependencies = (
    feature: keyof FeatureVisibility,
    currentConfig: FeatureVisibility
  ): { valid: boolean; missing: (keyof FeatureVisibility)[] } => {
    const requiredDeps = getDependencies(feature);
    const missing = requiredDeps.filter(dep => !currentConfig[dep]);
    
    return {
      valid: missing.length === 0,
      missing,
    };
  };

  return {
    getDependencies,
    getDependents,
    validateDependencies,
  };
}