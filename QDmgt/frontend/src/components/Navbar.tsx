import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, Spinner } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
};

const AppNavbar: React.FC = () => {
  const { user, loading, logout, isAdmin, isManagerOrAdmin } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      const message = getErrorMessage(error, '登出失败，请稍后重试');
      setLogoutError(message);
      console.error('[Navbar] Logout failed', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4" collapseOnSelect>
      <Container fluid>
        <Navbar.Brand className="fw-bold">渠道管理系统</Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="mx-auto">
            <Nav.Link as={NavLink} to="/dashboard" end className="px-3">
              仪表板
            </Nav.Link>
            <Nav.Link as={NavLink} to="/channels" className="px-3">
              渠道管理
            </Nav.Link>
            {isManagerOrAdmin() && (
              <Nav.Link as={NavLink} to="/assignments" className="px-3">
                分配管理
              </Nav.Link>
            )}
            <Nav.Link as={NavLink} to="/targets" className="px-3">
              目标规划
            </Nav.Link>
            <Nav.Link as={NavLink} to="/execution-plans" className="px-3">
              执行计划
            </Nav.Link>
            {isAdmin() && (
              <Nav.Link as={NavLink} to="/users" className="px-3">
                用户管理
              </Nav.Link>
            )}
          </Nav>
          <div className="d-flex align-items-center gap-3 ms-lg-3">
            {logoutError && (
              <span className="text-warning small">{logoutError}</span>
            )}
            {loading ? (
              <Spinner animation="border" size="sm" role="status">
                <span className="visually-hidden">正在加载用户信息...</span>
              </Spinner>
            ) : (
              <>
                <span className="text-light small">
                  {user ? `欢迎，${user.full_name || user.username}` : '未登录'}
                </span>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
                    <>
                      <Spinner
                        animation="border"
                        role="status"
                        size="sm"
                        className="me-2"
                      />
                      正在退出...
                    </>
                  ) : (
                    '退出登录'
                  )}
                </Button>
              </>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
