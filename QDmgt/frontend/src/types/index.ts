// Type definitions for the Channel Management System

export interface Channel {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  business_type: 'basic' | 'high-value' | 'pending-signup';
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  last_modified_by: string;
}

export interface TargetData {
  id: string;
  channel_id: string;
  year: number;
  quarter: number;
  month?: number;
  performance_target?: number;
  opportunity_target?: number;
  project_count_target?: number;
  development_goal?: string;
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  channel_id: string;
  permission_level: 'read' | 'write' | 'admin';
  assigned_at: string;
  assigned_by: string;
  target_responsibility: boolean;
}

export interface ExecutionPlan {
  id: string;
  channel_id: string;
  plan_year: number;
  plan_month: number;
  plan_week?: number;
  plan_content: string;
  responsible_person: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  actual_result?: string;
  completion_rate?: number;
  created_at: string;
  updated_at?: string;
}

// Filter types
export interface ChannelFilters {
  status?: string;
  businessType?: string;
  targetCompletion?: string;
  search?: string;
}

// Form data types
export interface ChannelFormData {
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  business_type: 'basic' | 'high-value' | 'pending-signup';
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface TargetFormData {
  channel_id: string;
  year: number;
  quarter: number;
  month?: number;
  performance_target?: number;
  opportunity_target?: number;
  project_count_target?: number;
  development_goal?: string;
}

export interface AssignmentFormData {
  user_id: string;
  channel_id: string;
  permission_level: 'read' | 'write' | 'admin';
  target_responsibility: boolean;
}

export interface ExecutionPlanFormData {
  channel_id: string;
  plan_year: number;
  plan_month: number;
  plan_week?: number;
  plan_content: string;
  responsible_person: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
