import React, { ReactNode, ButtonHTMLAttributes, HTMLProps } from 'react';
import './base.css';

// Button component
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const buttonClass = `btn btn-${variant} ${sizeClass} ${className}`.trim();

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};

// Card component
interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`card ${className}`.trim()}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`card-header ${className}`.trim()}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`card-body ${className}`.trim()}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h5 className={`card-title ${className}`.trim()}>
      {children}
    </h5>
  );
};

interface CardTextProps {
  children: ReactNode;
  className?: string;
}

export const CardText: React.FC<CardTextProps> = ({ children, className = '' }) => {
  return (
    <p className={`card-text ${className}`.trim()}>
      {children}
    </p>
  );
};

// Alert component
interface AlertProps {
  children: ReactNode;
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant,
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  const alertClass = `alert alert-${variant} ${dismissible ? 'alert-dismissible' : ''} ${className}`.trim();

  return (
    <div className={alertClass} role="alert">
      {children}
      {dismissible && (
        <button
          type="button"
          className="close"
          data-dismiss="alert"
          aria-label="Close"
          onClick={onDismiss}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
};

// Form components
interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`form-group ${className}`.trim()}>
      {children}
    </div>
  );
};

interface FormLabelProps extends HTMLProps<HTMLLabelElement> {
  children: ReactNode;
  className?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({ children, className = '', ...props }) => {
  return (
    <label className={`form-label ${className}`.trim()} {...props}>
      {children}
    </label>
  );
};

interface FormControlProps extends HTMLProps<HTMLInputElement> {
  isValid?: boolean;
  isInvalid?: boolean;
  className?: string;
}

export const FormControl: React.FC<FormControlProps> = ({
  isValid,
  isInvalid,
  className = '',
  ...props
}) => {
  const validationClass = isValid ? 'is-valid' : isInvalid ? 'is-invalid' : '';
  const controlClass = `form-control ${validationClass} ${className}`.trim();

  return (
    <input className={controlClass} {...props} />
  );
};

interface FormFeedbackProps {
  children: ReactNode;
  isValid?: boolean;
  className?: string;
}

export const FormFeedback: React.FC<FormFeedbackProps> = ({
  children,
  isValid,
  className = ''
}) => {
  const feedbackClass = isValid ? `valid-feedback ${className}`.trim() : `invalid-feedback ${className}`.trim();

  return (
    <div className={feedbackClass}>
      {children}
    </div>
  );
};

// Table component
interface TableProps {
  children: ReactNode;
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  children,
  striped = false,
  bordered = false,
  hover = false,
  size = 'md',
  className = ''
}) => {
  const tableClasses = [
    'table',
    striped ? 'table-striped' : '',
    bordered ? 'table-bordered' : '',
    hover ? 'table-hover' : '',
    size === 'sm' ? 'table-sm' : '',
    className
  ].filter(Boolean).join(' ').trim();

  return (
    <table className={tableClasses}>
      {children}
    </table>
  );
};

// Badge component
interface BadgeProps {
  children: ReactNode;
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  pill?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  pill = false,
  className = ''
}) => {
  const badgeClass = `badge badge-${variant} ${pill ? 'badge-pill' : ''} ${className}`.trim();

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
};

// Spinner component
interface SpinnerProps {
  variant?: 'border' | 'grow';
  size?: 'sm' | 'md';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  variant = 'border',
  size = 'md',
  className = ''
}) => {
  const spinnerClass = `spinner-${variant} ${size === 'sm' ? `spinner-${variant}-sm` : ''} ${className}`.trim();

  return (
    <span className={spinnerClass} role="status"></span>
  );
};

// Modal component
interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  size = 'md',
  className = ''
}) => {
  if (!isOpen) return null;

  const sizeClass = size !== 'md' ? `modal-${size}` : '';

  return (
    <div className="modal show" tabIndex={-1} role="dialog" style={{ display: 'block' }}>
      <div className={`modal-dialog ${sizeClass} ${className}`.trim()} role="document">
        <div className="modal-content">
          {children}
        </div>
      </div>
      <div className="modal-backdrop show" onClick={onClose}></div>
    </div>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  onClose,
  className = ''
}) => {
  return (
    <div className={`modal-header ${className}`.trim()}>
      {children}
      {onClose && (
        <button
          type="button"
          className="close"
          data-dismiss="modal"
          aria-label="Close"
          onClick={onClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
};

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`modal-body ${className}`.trim()}>
      {children}
    </div>
  );
};

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`modal-footer ${className}`.trim()}>
      {children}
    </div>
  );
};

export default {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  CardText,
  Alert,
  FormGroup,
  FormLabel,
  FormControl,
  FormFeedback,
  Table,
  Badge,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
};