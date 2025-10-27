import React from 'react';

// Validation and error handling utilities for the Channel Management System

interface ChannelData {
  name: string;
  description?: string;
  status: string;
  businessType: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface TargetPlanData {
  year: number;
  quarter: number;
  month?: number;
  performanceTarget?: number;
  opportunityTarget?: number;
  projectCountTarget?: number;
  developmentGoal?: string;
}

// Validation functions
export const validateChannel = (data: ChannelData): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.name = '渠道名称是必填项';
  } else if (data.name.length > 255) {
    errors.name = '渠道名称不能超过255个字符';
  }

  // Status validation
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(data.status)) {
    errors.status = '状态必须是 active, inactive 或 suspended 之一';
  }

  // Business type validation
  const validBusinessTypes = ['basic', 'high-value', 'pending-signup'];
  if (!validBusinessTypes.includes(data.businessType)) {
    errors.businessType = '业务类型必须是 basic, high-value 或 pending-signup 之一';
  }

  // Email validation
  if (data.contactEmail && data.contactEmail.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactEmail)) {
      errors.contactEmail = '请输入有效的邮箱地址';
    }
  }

  // Phone validation (basic format)
  if (data.contactPhone && data.contactPhone.trim() !== '') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/; // Basic phone format
    if (!phoneRegex.test(data.contactPhone.replace(/[\s\-\(\)]/g, ''))) {
      errors.contactPhone = '请输入有效的电话号码';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateTargetPlan = (data: TargetPlanData): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Year validation
  if (!data.year || data.year < 2000 || data.year > 2100) {
    errors.year = '年份必须在2000-2100之间';
  }

  // Quarter validation
  if (!data.quarter || data.quarter < 1 || data.quarter > 4) {
    errors.quarter = '季度必须在1-4之间';
  }

  // Month validation (if provided)
  if (data.month !== undefined && (data.month < 1 || data.month > 12)) {
    errors.month = '月份必须在1-12之间';
  }

  // Target values validation
  if (data.performanceTarget !== undefined && data.performanceTarget < 0) {
    errors.performanceTarget = '业绩目标不能为负数';
  }

  if (data.opportunityTarget !== undefined && data.opportunityTarget < 0) {
    errors.opportunityTarget = '商机目标不能为负数';
  }

  if (data.projectCountTarget !== undefined && data.projectCountTarget < 0) {
    errors.projectCountTarget = '项目数量目标不能为负数';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Error handling functions
export class ChannelManagementError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'ChannelManagementError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ChannelManagementError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
  }
}

export class NotFoundError extends ChannelManagementError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND_ERROR', { resource, id });
  }
}

export class UnauthorizedError extends ChannelManagementError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED_ERROR');
  }
}

export class ConflictError extends ChannelManagementError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR');
  }
}

// Utility function to handle API responses
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 400:
        throw new ValidationError(errorData.message || 'Bad request');
      case 401:
        throw new UnauthorizedError(errorData.message || 'Unauthorized');
      case 404:
        throw new NotFoundError(errorData.message || 'Resource not found');
      case 409:
        throw new ConflictError(errorData.message || 'Conflict');
      default:
        throw new ChannelManagementError(
          errorData.message || `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          { status: response.status, response: errorData }
        );
    }
  }
  
  return response.json();
};

// Validation hook for React components
export const useValidation = () => {
  const validate = (data: any, validator: Function) => {
    const { isValid, errors } = validator(data);
    return { isValid, errors };
  };

  return { validate };
};

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger">
          <h4>发生错误</h4>
          <p>{this.state.error?.message}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
