import axios from 'axios'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskListResponse,
  TaskComment,
  TaskCollaborator,
} from '../types/task'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Create a new task
 */
export async function createTask(data: CreateTaskInput): Promise<Task> {
  const response = await api.post<{ task: Task }>('/tasks', data)
  return response.data.task
}

/**
 * Get all tasks with filters and pagination
 */
export async function getTasks(
  page: number = 1,
  limit: number = 20,
  filters?: TaskFilters
): Promise<TaskListResponse> {
  const params: any = { page, limit }

  if (filters) {
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.distributorId) params.distributorId = filters.distributorId
    if (filters.search) params.search = filters.search
  }

  const response = await api.get<TaskListResponse>('/tasks', { params })
  return response.data
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<Task> {
  const response = await api.get<{ task: Task }>(`/tasks/${id}`)
  return response.data.task
}

/**
 * Update task
 */
export async function updateTask(
  id: string,
  data: UpdateTaskInput
): Promise<Task> {
  const response = await api.put<{ task: Task }>(`/tasks/${id}`, data)
  return response.data.task
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  id: string,
  status: string,
  reason?: string
): Promise<Task> {
  const response = await api.put<{ task: Task }>(`/tasks/${id}/status`, {
    status,
    reason,
  })
  return response.data.task
}

/**
 * Assign task to another user
 */
export async function assignTask(
  id: string,
  assignedUserId: string,
  reason?: string
): Promise<Task> {
  const response = await api.put<{ task: Task }>(`/tasks/${id}/assign`, {
    assignedUserId,
    reason,
  })
  return response.data.task
}

/**
 * Add collaborator to task
 */
export async function addCollaborator(
  taskId: string,
  userId: string
): Promise<TaskCollaborator> {
  const response = await api.post<{ collaborator: TaskCollaborator }>(
    `/tasks/${taskId}/collaborators`,
    { userId }
  )
  return response.data.collaborator
}

/**
 * Remove collaborator from task
 */
export async function removeCollaborator(
  taskId: string,
  userId: string
): Promise<void> {
  await api.delete(`/tasks/${taskId}/collaborators/${userId}`)
}

/**
 * Add comment to task
 */
export async function addComment(
  taskId: string,
  content: string
): Promise<TaskComment> {
  const response = await api.post<{ comment: TaskComment }>(
    `/tasks/${taskId}/comments`,
    { content }
  )
  return response.data.comment
}
