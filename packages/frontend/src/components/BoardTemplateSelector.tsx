import { Check, Zap, Target, Users } from 'lucide-react'
import { BoardTemplateConfig, BoardTemplate } from '@/types'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface BoardTemplateSelectorProps {
  selectedTemplate: BoardTemplate
  onTemplateSelect: (template: BoardTemplate) => void
  className?: string
}

const getTemplateIcon = (template: BoardTemplate) => {
  switch (template) {
    case 'basic':
      return <Target className="h-6 w-6" />
    case 'kanban':
      return <Zap className="h-6 w-6" />
    case 'scrum':
      return <Users className="h-6 w-6" />
    default:
      return <Target className="h-6 w-6" />
  }
}

const getFeatureDisplayName = (feature: string) => {
  const featureNames: Record<string, string> = {
    sprints: 'Sprints',
    storyPoints: 'Story Points',
    epics: 'Epics',
    timeTracking: 'Time Tracking',
    burndownCharts: 'Burndown Charts',
    customWorkflows: 'Custom Workflows',
    labels: 'Labels',
    priorities: 'Priorities',
  }
  return featureNames[feature] || feature
}

export function BoardTemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect, 
  className = '' 
}: BoardTemplateSelectorProps) {
  const [templates, setTemplates] = useState<BoardTemplateConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const response = await api.get('/boards/templates')
        setTemplates(response.data.templates)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch board templates:', err)
        setError('Failed to load board templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <h3 className="text-lg font-medium mb-2">Choose a Board Template</h3>
          <p className="text-sm text-muted-foreground">
            Loading available templates...
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="flex gap-1">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <h3 className="text-lg font-medium mb-2">Choose a Board Template</h3>
          <p className="text-sm text-destructive">
            {error}. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium mb-2">Choose a Board Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a template that best fits your workflow. You can customize features later.
        </p>
      </div>
      
      <div className="grid gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.name
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onTemplateSelect(template.name)}
          >
            {/* Selection indicator */}
            {selectedTemplate === template.name && (
              <div className="absolute top-3 right-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              {/* Template icon */}
              <div className={`p-2 rounded-lg ${
                selectedTemplate === template.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {getTemplateIcon(template.name)}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Template name and description */}
                <h4 className="font-medium text-foreground mb-1">
                  {template.displayName}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {template.description}
                </p>
                
                {/* Default columns */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Default Columns:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.defaultColumns.map((column, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted text-muted-foreground"
                      >
                        {column.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Enabled features */}
                {template.enabledFeatures.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Included Features:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.enabledFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary"
                        >
                          {getFeatureDisplayName(feature)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {template.enabledFeatures.length === 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Basic functionality only - perfect for getting started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> You can enable or disable any features later in board settings, 
          regardless of the template you choose.
        </p>
      </div>
    </div>
  )
}