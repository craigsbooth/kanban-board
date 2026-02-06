// Agile-specific backend types

export type BoardTemplate = 'basic' | 'kanban' | 'scrum'
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED'
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
export type IssueType = 'story' | 'bug' | 'task' | 'epic'

// Agile configuration interface
export interface AgileConfig {
  features: {
    sprints: boolean
    storyPoints: boolean
    epics: boolean
    timeTracking: boolean
    burndownCharts: boolean
    customWorkflows: boolean
    labels: boolean
    priorities: boolean
  }
  storyPointsScale: number[]
  defaultIssueType: IssueType
  requireEstimation: boolean
  sprintDuration: number // days
  workingDaysPerWeek: number
}

// Default Agile configuration
export const DEFAULT_AGILE_CONFIG: AgileConfig = {
  features: {
    sprints: false,
    storyPoints: false,
    epics: false,
    timeTracking: false,
    burndownCharts: false,
    customWorkflows: false,
    labels: false,
    priorities: false,
  },
  storyPointsScale: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  defaultIssueType: 'task',
  requireEstimation: false,
  sprintDuration: 14, // 2 weeks
  workingDaysPerWeek: 5,
}

// Board template configurations
export interface BoardTemplateConfig {
  id: string
  name: BoardTemplate
  displayName: string
  description: string
  defaultColumns: ColumnTemplate[]
  enabledFeatures: (keyof AgileConfig['features'])[]
  agileConfig: Partial<AgileConfig>
}

export interface ColumnTemplate {
  name: string
  position: number
  workflowStatus?: string
  color?: string
}

// Predefined board templates
export const BOARD_TEMPLATES: BoardTemplateConfig[] = [
  {
    id: 'basic',
    name: 'basic',
    displayName: 'Basic Board',
    description: 'Simple kanban board with basic functionality',
    defaultColumns: [
      { name: 'To Do', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'Done', position: 2 },
    ],
    enabledFeatures: [],
    agileConfig: {
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
    },
  },
  {
    id: 'kanban',
    name: 'kanban',
    displayName: 'Kanban Board',
    description: 'Continuous flow board with WIP limits and metrics',
    defaultColumns: [
      { name: 'Backlog', position: 0 },
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Review', position: 3 },
      { name: 'Done', position: 4 },
    ],
    enabledFeatures: ['storyPoints', 'epics', 'timeTracking', 'labels', 'priorities'],
    agileConfig: {
      features: {
        sprints: false,
        storyPoints: true,
        epics: true,
        timeTracking: true,
        burndownCharts: false,
        customWorkflows: true,
        labels: true,
        priorities: true,
      },
    },
  },
  {
    id: 'scrum',
    name: 'scrum',
    displayName: 'Scrum Board',
    description: 'Sprint-based board with full Scrum methodology support',
    defaultColumns: [
      { name: 'Product Backlog', position: 0 },
      { name: 'Sprint Backlog', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Review', position: 3 },
      { name: 'Done', position: 4 },
    ],
    enabledFeatures: ['sprints', 'storyPoints', 'epics', 'timeTracking', 'burndownCharts', 'labels', 'priorities'],
    agileConfig: {
      features: {
        sprints: true,
        storyPoints: true,
        epics: true,
        timeTracking: true,
        burndownCharts: true,
        customWorkflows: true,
        labels: true,
        priorities: true,
      },
      requireEstimation: true,
    },
  },
]

// DTO interfaces for API requests/responses
export interface CreateSprintDto {
  boardId: string
  name: string
  goal?: string
  startDate: Date
  endDate: Date
  capacity?: number
}

export interface UpdateSprintDto {
  name?: string
  goal?: string
  startDate?: Date
  endDate?: Date
  capacity?: number
  status?: SprintStatus
}

export interface CreateTimeEntryDto {
  cardId: string
  userId: string
  timeSpent: number // minutes
  description?: string
}

export interface CreateEpicLinkDto {
  epicId: string
  storyId: string
}

export interface CreateBoardLabelDto {
  boardId: string
  name: string
  color: string
}

export interface UpdateBoardLabelDto {
  name?: string
  color?: string
}

export interface WorkflowStatusDto {
  id: string
  name: string
  category: 'todo' | 'inprogress' | 'done'
  transitions: string[]
}

export interface CreateWorkflowDto {
  boardId: string
  name: string
  issueTypes: IssueType[]
  statuses: Omit<WorkflowStatusDto, 'id'>[]
}

export interface UpdateWorkflowDto {
  name?: string
  issueTypes?: IssueType[]
  statuses?: WorkflowStatusDto[]
}

// Burndown and reporting types
export interface BurndownDataPoint {
  date: Date
  remainingPoints: number
  completedPoints: number
  totalPoints: number
}

export interface VelocityDataPoint {
  sprintId: string
  sprintName: string
  completedPoints: number
  plannedPoints: number
  startDate: Date
  endDate: Date
}

export interface SprintMetrics {
  sprintId: string
  totalCards: number
  completedCards: number
  totalStoryPoints: number
  completedStoryPoints: number
  completionPercentage: number
  averageCardCompletionTime: number // hours
  velocityPoints: number
}

// Validation schemas
export const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
export const VALID_PRIORITIES: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']
export const VALID_ISSUE_TYPES: IssueType[] = ['story', 'bug', 'task', 'epic']
export const VALID_SPRINT_STATUSES: SprintStatus[] = ['PLANNING', 'ACTIVE', 'COMPLETED']

// Utility functions
export function isValidStoryPoints(points: number): boolean {
  return FIBONACCI_SEQUENCE.includes(points)
}

export function isValidPriority(priority: string): priority is Priority {
  return VALID_PRIORITIES.includes(priority as Priority)
}

export function isValidIssueType(issueType: string): issueType is IssueType {
  return VALID_ISSUE_TYPES.includes(issueType as IssueType)
}

export function isValidSprintStatus(status: string): status is SprintStatus {
  return VALID_SPRINT_STATUSES.includes(status as SprintStatus)
}

// Error types
export class AgileValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'AgileValidationError'
  }
}

export class SprintError extends Error {
  constructor(message: string, public sprintId?: string) {
    super(message)
    this.name = 'SprintError'
  }
}

export class WorkflowError extends Error {
  constructor(message: string, public workflowId?: string) {
    super(message)
    this.name = 'WorkflowError'
  }
}