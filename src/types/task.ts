export interface Task {
  id: string
  distributorId: string
  assignedUserId: string
  creatorUserId: string
  title: string
  description?: string
  deadline: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  archivedAt?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  distributor?: {
    id: string
    name: string
    region: string
  }
  assignedUser?: {
    id: string
    username: string
    name?: string
    email: string
  }
  creator?: {
    id: string
    username: string
    name?: string
  }
  collaborators?: TaskCollaborator[]
  comments?: TaskComment[]
  statusHistory?: TaskStatusHistory[]
  _count?: {
    comments: number
  }
}

export interface TaskCollaborator {
  id: string
  taskId: string
  userId: string
  addedBy: string
  addedAt: string
  user: {
    id: string
    username: string
    name?: string
    email?: string
  }
  addedByUser?: {
    id: string
    username: string
    name?: string
  }
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    name?: string
    email: string
  }
}

export interface TaskStatusHistory {
  id: string
  taskId: string
  fromStatus?: string
  toStatus: string
  changedBy: string
  reason?: string
  changedAt: string
  changedByUser: {
    id: string
    username: string
    name?: string
  }
}

export interface CreateTaskInput {
  distributorId: string
  assignedUserId: string
  title: string
  description?: string
  deadline: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  deadline?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface TaskFilters {
  status?: string
  priority?: string
  distributorId?: string
  search?: string
}

export interface TaskListResponse {
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
