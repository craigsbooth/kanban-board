// User types
export interface User {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt?: string
}

// Auth types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  usernameOrEmail: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
}

// Board types
export interface Board {
  id: string
  name: string
  description?: string
  inviteToken: string
  ownerId: string
  templateType: BoardTemplate
  agileConfig?: AgileConfig
  createdAt: string
  updatedAt: string
  owner: User
  members: BoardMember[]
  columns: Column[]
  swimLanes: SwimLane[]
  cards?: Card[]
  sprints?: Sprint[]
  labels?: BoardLabel[]
  workflows?: Workflow[]
  _count?: {
    cards: number
  }
}

export interface BoardMember {
  id: string
  boardId: string
  userId: string
  role: BoardMemberRole
  joinedAt: string
  user: User
}

export enum BoardMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDIT = 'EDIT',
  VIEW = 'VIEW',
}

// Column types
export interface Column {
  id: string
  boardId: string
  name: string
  position: number
  color?: string
}

// Swim lane types
export interface SwimLane {
  id: string
  boardId: string
  name: string
  position: number
  category: SwimLaneCategory
  color?: string
}

export enum SwimLaneCategory {
  PRIORITY = 'PRIORITY',
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
  CUSTOM = 'CUSTOM',
}

// Card types
export interface Card {
  id: string
  boardId: string
  columnId: string
  swimLaneId?: string
  title: string
  description?: string
  position: number
  dueDate?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  
  // Agile-specific fields
  storyPoints?: number
  originalEstimate?: number // hours
  timeSpent: number // hours
  remainingEstimate?: number // hours
  priority: Priority
  issueType: IssueType
  
  creator: User
  assignees: User[]
  labels: Label[]
  attachments?: Attachment[]
  customFields?: CustomField[]
  checklists?: Checklist[]
  comments?: Comment[]
  subscriptions?: CardSubscription[]
  
  // Agile relations
  sprintCards?: SprintCard[]
  epicLinks?: EpicLink[]
  storyLinks?: EpicLink[]
  timeEntries?: TimeEntry[]
  cardLabels?: CardLabel[]
  
  _count?: {
    attachments: number
    comments: number
    checklists: number
  }
}

// Label types
export interface Label {
  id: string
  cardId: string
  name: string
  color: string
  boardId: string
}

// Attachment types
export interface Attachment {
  id: string
  cardId: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

// Custom field types
export interface CustomField {
  id: string
  cardId: string
  name: string
  type: CustomFieldType
  value: string
}

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
}

// Checklist types
export interface Checklist {
  id: string
  cardId: string
  title: string
  items: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklistId: string
  text: string
  completed: boolean
  position: number
}

// Comment types
export interface Comment {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  user: User
}

// Subscription types
export interface CardSubscription {
  id: string
  cardId: string
  userId: string
  createdAt: string
}

// Agile-specific types

// Board template and configuration
export type BoardTemplate = 'basic' | 'kanban' | 'scrum'

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

export interface BoardTemplateConfig {
  id: string
  name: BoardTemplate
  displayName: string
  description: string
  defaultColumns: ColumnTemplate[]
  enabledFeatures: (keyof AgileConfig['features'])[]
  agileConfig?: Partial<AgileConfig>
}

export interface ColumnTemplate {
  name: string
  position: number
  workflowStatus?: string
  color?: string
}

// Sprint management
export interface Sprint {
  id: string
  boardId: string
  name: string
  goal?: string
  startDate: string
  endDate: string
  status: SprintStatus
  capacity?: number // story points
  createdAt: string
  updatedAt: string
  sprintCards?: SprintCard[]
  burndownSnapshots?: BurndownSnapshot[]
}

export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface SprintCard {
  sprintId: string
  cardId: string
  addedAt: string
  completedAt?: string
  storyPoints?: number
  sprint: Sprint
  card: Card
}

// Story points and estimation
export interface StoryPointsConfig {
  boardId: string
  enabled: boolean
  scale: number[] // [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
  requireEstimation: boolean
}

export interface CardEstimation {
  cardId: string
  storyPoints?: number
  originalEstimate?: number // hours
  timeSpent: number // hours
  remainingEstimate?: number // hours
}

// Epic and story hierarchy
export interface EpicLink {
  id: string
  epicId: string // parent card
  storyId: string // child card
  createdAt: string
  epic: Card
  story: Card
}

export interface EpicProgress {
  epicId: string
  totalStories: number
  completedStories: number
  totalStoryPoints: number
  completedStoryPoints: number
  progressPercentage: number
}

// Time tracking
export interface TimeEntry {
  id: string
  cardId: string
  userId: string
  timeSpent: number // minutes
  description?: string
  loggedAt: string
  card: Card
  user: User
}

export interface TimeTrackingSummary {
  cardId: string
  totalTimeSpent: number // minutes
  entries: TimeEntry[]
  originalEstimate?: number // hours
  remainingEstimate?: number // hours
}

// Labels and priorities
export interface BoardLabel {
  id: string
  boardId: string
  name: string
  color: string
  createdAt: string
  cardLabels?: CardLabel[]
}

export interface CardLabel {
  cardId: string
  labelId: string
  card: Card
  label: BoardLabel
}

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
export type IssueType = 'story' | 'bug' | 'task' | 'epic'

// Custom workflows
export interface Workflow {
  id: string
  boardId: string
  name: string
  issueTypes: IssueType[] // array of issue types this workflow applies to
  statuses: WorkflowStatus[] // array of status objects with transitions
  createdAt: string
}

export interface WorkflowStatus {
  id: string
  name: string
  category: 'todo' | 'inprogress' | 'done'
  transitions: string[] // array of status IDs this status can transition to
}

// Reporting and metrics
export interface BurndownSnapshot {
  id: string
  sprintId: string
  snapshotDate: string
  remainingPoints: number
  completedPoints: number
  totalPoints: number
  createdAt: string
  sprint: Sprint
}

export interface BurndownChartData {
  sprintId: string
  sprintName: string
  startDate: string
  endDate: string
  snapshots: BurndownSnapshot[]
  idealLine: { date: string; points: number }[]
  actualLine: { date: string; points: number }[]
}

export interface VelocityData {
  sprintId: string
  sprintName: string
  completedPoints: number
  plannedPoints: number
  startDate: string
  endDate: string
}

export interface VelocityMetrics {
  boardId: string
  sprints: VelocityData[]
  averageVelocity: number
  velocityTrend: 'increasing' | 'decreasing' | 'stable'
  suggestedCapacity: number
}

export interface SprintReport {
  sprint: Sprint
  totalCards: number
  completedCards: number
  totalStoryPoints: number
  completedStoryPoints: number
  burndownData: BurndownChartData
  velocityData: VelocityData
}

// API response types
export interface ApiResponse<T = any> {
  message?: string
  data?: T
  error?: {
    message: string
    details?: any
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface CreateBoardForm {
  name: string
  description?: string
  templateType?: BoardTemplate
  agileConfig?: Partial<AgileConfig>
}

export interface UpdateBoardForm {
  name?: string
  description?: string
  templateType?: BoardTemplate
  agileConfig?: Partial<AgileConfig>
}

export interface CreateCardForm {
  boardId: string
  columnId: string
  swimLaneId?: string
  title: string
  description?: string
  position?: number
  storyPoints?: number
  priority?: Priority
  issueType?: IssueType
  originalEstimate?: number
}

export interface UpdateCardForm {
  title?: string
  description?: string
  columnId?: string
  swimLaneId?: string
  position?: number
  dueDate?: string
  storyPoints?: number
  priority?: Priority
  issueType?: IssueType
  originalEstimate?: number
  remainingEstimate?: number
}

// Agile-specific form types
export interface CreateSprintForm {
  boardId: string
  name: string
  goal?: string
  startDate: string
  endDate: string
  capacity?: number
}

export interface UpdateSprintForm {
  name?: string
  goal?: string
  startDate?: string
  endDate?: string
  capacity?: number
  status?: SprintStatus
}

export interface CreateTimeEntryForm {
  cardId: string
  timeSpent: number // minutes
  description?: string
}

export interface CreateBoardLabelForm {
  boardId: string
  name: string
  color: string
}

export interface UpdateBoardLabelForm {
  name?: string
  color?: string
}

export interface CreateWorkflowForm {
  boardId: string
  name: string
  issueTypes: IssueType[]
  statuses: Omit<WorkflowStatus, 'id'>[]
}

export interface UpdateWorkflowForm {
  name?: string
  issueTypes?: IssueType[]
  statuses?: WorkflowStatus[]
}

// Socket event types
export interface SocketCardMoved {
  cardId: string
  boardId: string
  columnId: string
  swimLaneId?: string
  position: number
  userId: string
  timestamp: string
}

export interface SocketCardUpdated {
  cardId: string
  boardId: string
  changes: Record<string, any>
  userId: string
  timestamp: string
}

export interface SocketUserTyping {
  boardId: string
  cardId?: string
  isTyping: boolean
  userId: string
  timestamp: string
}

// Agile-specific socket events
export interface SocketSprintUpdated {
  sprintId: string
  boardId: string
  changes: Record<string, any>
  userId: string
  timestamp: string
}

export interface SocketSprintCardAdded {
  sprintId: string
  cardId: string
  boardId: string
  userId: string
  timestamp: string
}

export interface SocketSprintCardRemoved {
  sprintId: string
  cardId: string
  boardId: string
  userId: string
  timestamp: string
}

export interface SocketTimeEntryAdded {
  timeEntryId: string
  cardId: string
  boardId: string
  timeSpent: number
  userId: string
  timestamp: string
}

export interface SocketEpicLinkCreated {
  epicLinkId: string
  epicId: string
  storyId: string
  boardId: string
  userId: string
  timestamp: string
}

export interface SocketEpicLinkRemoved {
  epicLinkId: string
  epicId: string
  storyId: string
  boardId: string
  userId: string
  timestamp: string
}

// Drag and drop types
export interface DragResult {
  draggableId: string
  type: string
  source: {
    droppableId: string
    index: number
  }
  destination?: {
    droppableId: string
    index: number
  }
  reason: 'DROP' | 'CANCEL'
}