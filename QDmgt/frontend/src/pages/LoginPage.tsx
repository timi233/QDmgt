import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

type LoginFormErrors = Partial<Record<'username' | 'password', string>>;

const initialFormValues: LoginFormValues = {
  username: '',
  password: '',
  rememberMe: false,
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading: authLoading, isAuthenticated } = useAuth();

  const [formValues, setFormValues] = useState<LoginFormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/channels', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = event.target;

    setFormValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'username' || name === 'password') {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: LoginFormErrors = {};
    const trimmedUsername = formValues.username.trim();

    if (!trimmedUsername) {
      errors.username = '请输入用户名';
    }

    if (!formValues.password) {
      errors.password = '请输入密码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await login({
        username: formValues.username.trim(),
        password: formValues.password,
      });

      navigate('/channels', { replace: true });
    } catch (error) {
      let message = '登录失败，请检查用户名或密码';

      if (error && typeof error === 'object' && 'message' in error) {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
          message = maybeMessage;
        }
      }

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !isSubmitting) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">正在加载...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <Row className="w-100 justify-content-center">
        <Col xs={11} sm={9} md={7} lg={5} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 p-md-5">
              <div className="mb-4 text-center">
                <h2 className="fw-bold">渠道管理平台</h2>
                <p className="text-muted mb-0">请登录以继续</p>
              </div>

              {submitError && (
                <Alert variant="danger" onClose={() => setSubmitError(null)} dismissible>
                  {submitError}
                </Alert>
              )}

              <Form noValidate onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="loginUsername">
                  <Form.Label>用户名</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    placeholder="请输入用户名"
                    value={formValues.username}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.username}
                    autoComplete="username"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.username}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="loginPassword">
                  <Form.Label>密码</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="请输入密码"
                    value={formValues.password}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.password}
                    autoComplete="current-password"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Form.Check
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    label="记住我"
                    checked={formValues.rememberMe}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting || authLoading}
                  >
                    {(isSubmitting || authLoading) && (
                      <Spinner animation="border" size="sm" className="me-2" />
                    )}
                    登录
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
