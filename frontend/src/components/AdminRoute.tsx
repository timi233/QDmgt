import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

interface AdminRouteProps {
  element: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ element }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">正在加载...</span>
        </Spinner>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/channels" replace />;
  }

  return element;
};

export default AdminRoute;
