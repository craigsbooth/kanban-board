import { 
  BOARD_TEMPLATES, 
  DEFAULT_AGILE_CONFIG, 
  BoardTemplate, 
  AgileConfig,
  BoardTemplateConfig,
  AgileValidationError 
} from '../types/agile';

export class TemplateService {
  /**
   * Get all available board templates
   */
  static getAvailableTemplates(): BoardTemplateConfig[] {
    return BOARD_TEMPLATES;
  }

  /**
   * Get a specific template by name
   */
  static getTemplate(templateName: BoardTemplate): BoardTemplateConfig {
    const template = BOARD_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
      throw new AgileValidationError(`Invalid template: ${templateName}`);
    }
    return template;
  }

  /**
   * Validate template configuration
   */
  static validateTemplate(templateName: string): templateName is BoardTemplate {
    return BOARD_TEMPLATES.some(t => t.name === templateName);
  }

  /**
   * Generate agile configuration for a template with user overrides
   */
  static generateAgileConfig(
    templateName: BoardTemplate, 
    userOverrides?: Partial<AgileConfig>
  ): AgileConfig {
    const template = this.getTemplate(templateName);
    
    // Start with default config
    let config: AgileConfig = { ...DEFAULT_AGILE_CONFIG };
    
    // Apply template-specific configuration
    if (template.agileConfig) {
      config = {
        ...config,
        ...template.agileConfig,
        features: {
          ...config.features,
          ...template.agileConfig.features,
        },
      };
    }
    
    // Apply user overrides
    if (userOverrides) {
      config = {
        ...config,
        ...userOverrides,
        features: {
          ...config.features,
          ...userOverrides.features,
        },
      };
    }
    
    return config;
  }

  /**
   * Validate agile configuration
   */
  static validateAgileConfig(config: Partial<AgileConfig>): void {
    if (config.storyPointsScale) {
      // Validate story points scale contains only positive numbers
      if (!Array.isArray(config.storyPointsScale) || 
          config.storyPointsScale.some(point => typeof point !== 'number' || point <= 0)) {
        throw new AgileValidationError('Story points scale must be an array of positive numbers');
      }
    }

    if (config.sprintDuration !== undefined) {
      if (typeof config.sprintDuration !== 'number' || 
          config.sprintDuration < 1 || 
          config.sprintDuration > 30) {
        throw new AgileValidationError('Sprint duration must be between 1 and 30 days');
      }
    }

    if (config.workingDaysPerWeek !== undefined) {
      if (typeof config.workingDaysPerWeek !== 'number' || 
          config.workingDaysPerWeek < 1 || 
          config.workingDaysPerWeek > 7) {
        throw new AgileValidationError('Working days per week must be between 1 and 7');
      }
    }

    if (config.defaultIssueType !== undefined) {
      const validIssueTypes = ['story', 'bug', 'task', 'epic'];
      if (!validIssueTypes.includes(config.defaultIssueType)) {
        throw new AgileValidationError(`Default issue type must be one of: ${validIssueTypes.join(', ')}`);
      }
    }
  }

  /**
   * Check if a feature is enabled for a board
   */
  static isFeatureEnabled(agileConfig: AgileConfig | null, feature: keyof AgileConfig['features']): boolean {
    if (!agileConfig) return false;
    return agileConfig.features[feature] || false;
  }

  /**
   * Get enabled features for a board
   */
  static getEnabledFeatures(agileConfig: AgileConfig | null): (keyof AgileConfig['features'])[] {
    if (!agileConfig) return [];
    
    return Object.entries(agileConfig.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature as keyof AgileConfig['features']);
  }

  /**
   * Merge agile configurations (useful for updates)
   */
  static mergeAgileConfigs(
    currentConfig: AgileConfig | null, 
    updates: Partial<AgileConfig>
  ): AgileConfig {
    const baseConfig = currentConfig || DEFAULT_AGILE_CONFIG;
    
    return {
      ...baseConfig,
      ...updates,
      features: {
        ...baseConfig.features,
        ...updates.features,
      },
    };
  }

  /**
   * Get template recommendations based on team size and project type
   */
  static getTemplateRecommendations(criteria: {
    teamSize?: number;
    projectType?: 'personal' | 'team' | 'enterprise';
    methodology?: 'agile' | 'waterfall' | 'kanban';
  }): BoardTemplateConfig[] {
    const { teamSize = 1, projectType = 'personal', methodology } = criteria;
    
    let recommendations: BoardTemplateConfig[] = [];
    
    // Personal projects or small teams
    if (teamSize <= 2 || projectType === 'personal') {
      recommendations.push(this.getTemplate('basic'));
      if (methodology === 'kanban') {
        recommendations.push(this.getTemplate('kanban'));
      }
    }
    
    // Medium teams
    if (teamSize > 2 && teamSize <= 10) {
      if (methodology === 'agile' || methodology === 'kanban') {
        recommendations.push(this.getTemplate('kanban'));
      }
      if (methodology === 'agile') {
        recommendations.push(this.getTemplate('scrum'));
      }
      recommendations.push(this.getTemplate('basic'));
    }
    
    // Large teams or enterprise
    if (teamSize > 10 || projectType === 'enterprise') {
      recommendations.push(this.getTemplate('scrum'));
      recommendations.push(this.getTemplate('kanban'));
      recommendations.push(this.getTemplate('basic'));
    }
    
    // If no specific methodology, return all templates
    if (!methodology) {
      recommendations = BOARD_TEMPLATES;
    }
    
    // Remove duplicates and return
    return recommendations.filter((template, index, self) => 
      index === self.findIndex(t => t.id === template.id)
    );
  }

  /**
   * Upgrade an existing board to use a new template
   */
  static generateUpgradeConfig(
    currentTemplate: BoardTemplate,
    targetTemplate: BoardTemplate,
    preserveData: boolean = true
  ): {
    newAgileConfig: AgileConfig;
    columnsToAdd: Array<{ name: string; position: number; color?: string }>;
    columnsToRemove: string[];
    warnings: string[];
  } {
    const currentTemplateConfig = this.getTemplate(currentTemplate);
    const targetTemplateConfig = this.getTemplate(targetTemplate);
    
    const warnings: string[] = [];
    const columnsToAdd: Array<{ name: string; position: number; color?: string }> = [];
    const columnsToRemove: string[] = [];
    
    // Generate new agile config
    const newAgileConfig = this.generateAgileConfig(targetTemplate);
    
    // Compare columns
    const currentColumns = currentTemplateConfig.defaultColumns.map(c => c.name);
    const targetColumns = targetTemplateConfig.defaultColumns.map(c => c.name);
    
    // Find columns to add
    targetTemplateConfig.defaultColumns.forEach(targetCol => {
      if (!currentColumns.includes(targetCol.name)) {
        columnsToAdd.push(targetCol);
      }
    });
    
    // Find columns to remove (only if not preserving data)
    if (!preserveData) {
      currentTemplateConfig.defaultColumns.forEach(currentCol => {
        if (!targetColumns.includes(currentCol.name)) {
          columnsToRemove.push(currentCol.name);
        }
      });
    }
    
    // Generate warnings
    if (columnsToRemove.length > 0) {
      warnings.push(`The following columns will be removed: ${columnsToRemove.join(', ')}`);
    }
    
    // Feature-specific warnings
    const currentFeatures = this.getEnabledFeatures(currentTemplateConfig.agileConfig as AgileConfig);
    const targetFeatures = this.getEnabledFeatures(newAgileConfig);
    
    const disabledFeatures = currentFeatures.filter(f => !targetFeatures.includes(f));
    if (disabledFeatures.length > 0) {
      warnings.push(`The following features will be disabled: ${disabledFeatures.join(', ')}`);
    }
    
    const enabledFeatures = targetFeatures.filter(f => !currentFeatures.includes(f));
    if (enabledFeatures.length > 0) {
      warnings.push(`The following features will be enabled: ${enabledFeatures.join(', ')}`);
    }
    
    return {
      newAgileConfig,
      columnsToAdd,
      columnsToRemove,
      warnings,
    };
  }
}