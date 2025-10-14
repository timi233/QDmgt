import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

interface ManagerRouteProps {
  element: React.ReactElement;
}

const ManagerRoute: React.FC<ManagerRouteProps> = ({ element }) => {
  const { isAuthenticated, isManagerOrAdmin, loading } = useAuth();

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

  if (!isManagerOrAdmin()) {
    return <Navigate to="/channels" replace />;
  }

  return element;
};

export default ManagerRoute;
