import { ReactNode } from 'react';
import { AgileConfig } from '@/types';
import { useFeatureVisibility, FeatureVisibility } from '@/hooks/useFeatureVisibility';

interface FeatureGateProps {
  feature: keyof FeatureVisibility;
  agileConfig: AgileConfig | null | undefined;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

interface MultiFeatureGateProps {
  features: (keyof FeatureVisibility)[];
  agileConfig: AgileConfig | null | undefined;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

/**
 * Component that conditionally renders children based on whether a feature is enabled
 */
export function FeatureGate({ 
  feature, 
  agileConfig, 
  children, 
  fallback = null 
}: FeatureGateProps) {
  const { isFeatureEnabled } = useFeatureVisibility(agileConfig);
  
  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Component that conditionally renders children based on multiple features
 */
export function MultiFeatureGate({ 
  features, 
  agileConfig, 
  children, 
  fallback = null,
  requireAll = true 
}: MultiFeatureGateProps) {
  const { isFeatureEnabled } = useFeatureVisibility(agileConfig);
  
  const hasRequiredFeatures = requireAll
    ? features.every(feature => isFeatureEnabled(feature))
    : features.some(feature => isFeatureEnabled(feature));
  
  if (hasRequiredFeatures) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Higher-order component that wraps a component with feature gating
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: keyof FeatureVisibility,
  fallback?: ReactNode
) {
  return function FeatureGatedComponent(props: P & { agileConfig: AgileConfig | null | undefined }) {
    const { agileConfig, ...componentProps } = props;
    
    return (
      <FeatureGate feature={feature} agileConfig={agileConfig} fallback={fallback}>
        <WrappedComponent {...(componentProps as P)} />
      </FeatureGate>
    );
  };
}

/**
 * Hook-based feature gate for conditional logic within components
 */
export function useFeatureGate(
  feature: keyof FeatureVisibility,
  agileConfig: AgileConfig | null | undefined
): boolean {
  const { isFeatureEnabled } = useFeatureVisibility(agileConfig);
  return isFeatureEnabled(feature);
}

/**
 * Component for displaying feature requirement messages
 */
interface FeatureRequiredMessageProps {
  feature: keyof FeatureVisibility;
  operation: string;
  className?: string;
}

export function FeatureRequiredMessage({ 
  feature, 
  operation, 
  className = '' 
}: FeatureRequiredMessageProps) {
  const featureNames: Record<keyof FeatureVisibility, string> = {
    sprints: 'Sprints',
    storyPoints: 'Story Points',
    epics: 'Epics',
    timeTracking: 'Time Tracking',
    burndownCharts: 'Burndown Charts',
    customWorkflows: 'Custom Workflows',
    labels: 'Labels',
    priorities: 'Priorities',
  };

  return (
    <div className={`text-sm text-muted-foreground p-4 border border-dashed rounded-lg ${className}`}>
      <p>
        <strong>{operation}</strong> requires the <strong>{featureNames[feature]}</strong> feature to be enabled.
      </p>
      <p className="mt-1 text-xs">
        Enable this feature in board settings to use this functionality.
      </p>
    </div>
  );
}

/**
 * Component for displaying multiple feature requirement messages
 */
interface MultiFeatureRequiredMessageProps {
  features: (keyof FeatureVisibility)[];
  operation: string;
  requireAll?: boolean;
  className?: string;
}

export function MultiFeatureRequiredMessage({ 
  features, 
  operation, 
  requireAll = true,
  className = '' 
}: MultiFeatureRequiredMessageProps) {
  const featureNames: Record<keyof FeatureVisibility, string> = {
    sprints: 'Sprints',
    storyPoints: 'Story Points',
    epics: 'Epics',
    timeTracking: 'Time Tracking',
    burndownCharts: 'Burndown Charts',
    customWorkflows: 'Custom Workflows',
    labels: 'Labels',
    priorities: 'Priorities',
  };

  const featureList = features.map(f => featureNames[f]).join(', ');
  const conjunction = requireAll ? 'and' : 'or';
  const lastCommaIndex = featureList.lastIndexOf(', ');
  const formattedList = lastCommaIndex > -1 
    ? featureList.substring(0, lastCommaIndex) + ` ${conjunction} ` + featureList.substring(lastCommaIndex + 2)
    : featureList;

  return (
    <div className={`text-sm text-muted-foreground p-4 border border-dashed rounded-lg ${className}`}>
      <p>
        <strong>{operation}</strong> requires the following features to be enabled: <strong>{formattedList}</strong>.
      </p>
      <p className="mt-1 text-xs">
        Enable {requireAll ? 'all of these features' : 'at least one of these features'} in board settings to use this functionality.
      </p>
    </div>
  );
}