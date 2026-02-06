import React, { useState } from 'react'
import { Save, RotateCcw, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AgileConfig, Board, IssueType } from '@/types'
import toast from 'react-hot-toast'

interface BoardAgileSettingsProps {
  board: Board
  onSave: (config: Partial<AgileConfig>) => Promise<void>
  className?: string
}

const FEATURE_DESCRIPTIONS = {
  sprints: {
    name: 'Sprints',
    description: 'Time-boxed iterations for Scrum methodology. Enables sprint planning, active sprints, and sprint completion.',
    dependencies: ['storyPoints'],
    warning: 'Requires story points for capacity planning.',
  },
  storyPoints: {
    name: 'Story Points',
    description: 'Estimation system using Fibonacci sequence. Helps with sprint planning and velocity tracking.',
    dependencies: [],
    warning: null,
  },
  epics: {
    name: 'Epics',
    description: 'Large work items that can be broken down into smaller stories. Helps organize related work.',
    dependencies: [],
    warning: null,
  },
  timeTracking: {
    name: 'Time Tracking',
    description: 'Track time spent on cards with manual entry or timer. Useful for reporting and estimation improvement.',
    dependencies: [],
    warning: null,
  },
  burndownCharts: {
    name: 'Burndown Charts',
    description: 'Visual progress tracking for sprints. Shows remaining work over time.',
    dependencies: ['sprints', 'storyPoints'],
    warning: 'Requires sprints and story points to be enabled.',
  },
  customWorkflows: {
    name: 'Custom Workflows',
    description: 'Define custom status transitions for different issue types. Provides more control over work processes.',
    dependencies: [],
    warning: null,
  },
  labels: {
    name: 'Labels',
    description: 'Categorize cards with custom colored labels. Helps with organization and filtering.',
    dependencies: [],
    warning: null,
  },
  priorities: {
    name: 'Priorities',
    description: 'Assign priority levels to cards (Highest, High, Medium, Low, Lowest). Helps with work prioritization.',
    dependencies: [],
    warning: null,
  },
}

const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'story', label: 'Story' },
  { value: 'bug', label: 'Bug' },
  { value: 'epic', label: 'Epic' },
]

export function BoardAgileSettings({ board, onSave, className = '' }: BoardAgileSettingsProps) {
  const [config, setConfig] = useState<AgileConfig>(
    board.agileConfig || {
      features: {
        sprints: false,
        storyPoints: false,
        epics: false,
        timeTracking: false,
        burndownCharts: false,
        customWorkflows: false,
        labels: true,
        priorities: true,
      },
      storyPointsScale: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      defaultIssueType: 'task',
      requireEstimation: false,
      sprintDuration: 14,
      workingDaysPerWeek: 5,
    }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleFeatureToggle = (feature: keyof AgileConfig['features']) => {
    const newFeatures = { ...config.features }
    const isEnabling = !newFeatures[feature]
    
    if (isEnabling) {
      // Auto-enable dependencies
      const dependencies = FEATURE_DESCRIPTIONS[feature].dependencies
      dependencies.forEach(dep => {
        newFeatures[dep as keyof AgileConfig['features']] = true
      })
    } else {
      // Check if other features depend on this one
      const dependentFeatures = Object.entries(FEATURE_DESCRIPTIONS)
        .filter(([_, desc]) => desc.dependencies.includes(feature))
        .map(([key, _]) => key)
      
      // Auto-disable dependent features
      dependentFeatures.forEach(dep => {
        newFeatures[dep as keyof AgileConfig['features']] = false
      })
    }
    
    newFeatures[feature] = isEnabling
    
    setConfig(prev => ({ ...prev, features: newFeatures }))
    setHasChanges(true)
  }

  const handleConfigChange = (key: keyof Omit<AgileConfig, 'features'>, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      await onSave(config)
      setHasChanges(false)
      toast.success('Board settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save board settings')
      console.error('Save error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setConfig(board.agileConfig || {
      features: {
        sprints: false,
        storyPoints: false,
        epics: false,
        timeTracking: false,
        burndownCharts: false,
        customWorkflows: false,
        labels: true,
        priorities: true,
      },
      storyPointsScale: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      defaultIssueType: 'task',
      requireEstimation: false,
      sprintDuration: 14,
      workingDaysPerWeek: 5,
    })
    setHasChanges(false)
  }

  const getEnabledFeaturesCount = () => {
    return Object.values(config.features).filter(Boolean).length
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agile Features</h2>
          <p className="text-sm text-muted-foreground">
            Configure which Agile methodology features are enabled for this board.
            {getEnabledFeaturesCount() > 0 && (
              <span className="ml-2 text-primary">
                {getEnabledFeaturesCount()} feature{getEnabledFeaturesCount() !== 1 ? 's' : ''} enabled
              </span>
            )}
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Feature Toggles */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Feature Configuration</h3>
        
        <div className="space-y-4">
          {Object.entries(FEATURE_DESCRIPTIONS).map(([key, desc]) => {
            const feature = key as keyof AgileConfig['features']
            const isEnabled = config.features[feature]
            const hasWarning = desc.warning && isEnabled && 
              desc.dependencies.some(dep => !config.features[dep as keyof AgileConfig['features']])
            
            return (
              <div key={key} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleFeatureToggle(feature)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="font-medium">{desc.name}</span>
                  </label>
                  
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{desc.description}</p>
                    
                    {desc.dependencies.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Info className="h-3 w-3 inline mr-1" />
                        Depends on: {desc.dependencies.join(', ')}
                      </p>
                    )}
                    
                    {hasWarning && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {desc.warning}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Advanced Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Advanced Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Story Points Scale */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Story Points Scale
            </label>
            <input
              type="text"
              value={config.storyPointsScale.join(', ')}
              onChange={(e) => {
                const scale = e.target.value
                  .split(',')
                  .map(s => parseInt(s.trim()))
                  .filter(n => !isNaN(n) && n > 0)
                handleConfigChange('storyPointsScale', scale)
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="1, 2, 3, 5, 8, 13, 21, 34, 55, 89"
              disabled={!config.features.storyPoints}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated list of story point values (Fibonacci sequence recommended)
            </p>
          </div>

          {/* Default Issue Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Issue Type
            </label>
            <select
              value={config.defaultIssueType}
              onChange={(e) => handleConfigChange('defaultIssueType', e.target.value as IssueType)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {ISSUE_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Default issue type for new cards
            </p>
          </div>

          {/* Sprint Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sprint Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.sprintDuration}
              onChange={(e) => handleConfigChange('sprintDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              disabled={!config.features.sprints}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default duration for new sprints
            </p>
          </div>

          {/* Working Days Per Week */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Working Days Per Week
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={config.workingDaysPerWeek}
              onChange={(e) => handleConfigChange('workingDaysPerWeek', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for burndown chart calculations
            </p>
          </div>
        </div>

        {/* Require Estimation */}
        <div className="mt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireEstimation}
              onChange={(e) => handleConfigChange('requireEstimation', e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              disabled={!config.features.storyPoints}
            />
            <span className="font-medium">Require Story Point Estimation</span>
          </label>
          <p className="text-sm text-muted-foreground ml-6">
            Prevent adding cards to sprints without story point estimates
          </p>
        </div>
      </Card>

      {/* Template Information */}
      <Card className="p-6 bg-muted/25">
        <h3 className="text-lg font-medium mb-2">Board Template</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This board was created using the <strong>{board.templateType}</strong> template.
          You can customize any features above regardless of the original template.
        </p>
        
        <div className="text-xs text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> Changes to these settings only affect this board. 
            New boards will use the default template configuration.
          </p>
        </div>
      </Card>
    </div>
  )
}