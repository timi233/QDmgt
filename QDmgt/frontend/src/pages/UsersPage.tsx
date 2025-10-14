import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import authService, { RegisterRequest, User, UserRole } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormatter';

interface CreateUserFormValues {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

interface EditUserFormValues {
  role: UserRole;
  is_active: boolean;
  password: string;
}

const defaultCreateFormValues: CreateUserFormValues = {
  username: '',
  email: '',
  password: '',
  full_name: '',
  role: 'user',
};

const defaultEditFormValues: EditUserFormValues = {
  role: 'user',
  is_active: true,
  password: '',
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
};

const UsersPage: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createFormValues, setCreateFormValues] = useState<CreateUserFormValues>(defaultCreateFormValues);
  const [editFormValues, setEditFormValues] = useState<EditUserFormValues>(defaultEditFormValues);

  const [actionLoading, setActionLoading] = useState<null | 'create' | 'edit' | 'delete'>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err) {
      const message = getErrorMessage(err, '加载用户列表失败');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers().catch(() => {});
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUser) {
      setEditFormValues({
        role: selectedUser.role,
        is_active: selectedUser.is_active,
      });
    } else {
      setEditFormValues(defaultEditFormValues);
    }
  }, [selectedUser]);

  const resetCreateForm = useCallback(() => {
    setCreateFormValues(defaultCreateFormValues);
  }, []);

  const handleCreateInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCreateFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
      setEditFormValues((prev) => ({
        ...prev,
        [name]: event.target.checked,
      }));
      return;
    }

    setEditFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
    setSuccessMessage(null);
    setError(null);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
    setSuccessMessage(null);
    setError(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setActionLoading('create');
    setError(null);
    setSuccessMessage(null);

    const payload: RegisterRequest = {
      username: createFormValues.username.trim(),
      email: createFormValues.email.trim(),
      password: createFormValues.password,
      full_name: createFormValues.full_name.trim() || undefined,
      role: createFormValues.role,
    };

    try {
      await authService.register(payload);
      setShowCreateModal(false);
      resetCreateForm();
      await loadUsers();
      setSuccessMessage('用户创建成功');
    } catch (err) {
      const message = getErrorMessage(err, '创建用户失败');
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setActionLoading('edit');
    setError(null);
    setSuccessMessage(null);

    try {
      const updateData: { role: string; is_active: boolean; password?: string } = {
        role: editFormValues.role,
        is_active: editFormValues.is_active,
      };

      // 只在密码字段有值时才发送密码
      if (editFormValues.password.trim()) {
        updateData.password = editFormValues.password;
      }

      await authService.updateUser(selectedUser.id, updateData);

      if (currentUser && currentUser.id === selectedUser.id) {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn('[UsersPage] Failed to refresh current user after update', refreshError);
        }
      }

      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
      setSuccessMessage('用户信息更新成功');
    } catch (err) {
      const message = getErrorMessage(err, '更新用户失败');
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) {
      return;
    }

    setActionLoading('delete');
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.deleteUser(selectedUser.id);

      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setSelectedUser(null);

      await loadUsers();
      setSuccessMessage(`用户 '${selectedUser.username}' 已成功删除`);
    } catch (err) {
      const message = getErrorMessage(err, '删除用户失败');
      setError(message);
      setShowDeleteConfirm(false);
    } finally {
      setActionLoading(null);
    }
  };

  const roleOptions = useMemo<UserRole[]>(() => ['admin', 'manager', 'user'], []);

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">用户管理</h2>
            <Button variant="primary" onClick={handleOpenCreateModal}>
              新增用户
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
              {successMessage}
            </Alert>
          )}

          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" />
                  <div className="mt-3">正在加载用户数据...</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>用户名</th>
                        <th>姓名</th>
                        <th>邮箱</th>
                        <th>角色</th>
                        <th>状态</th>
                        <th>创建时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4">
                            暂无用户数据
                          </td>
                        </tr>
                      ) : (
                        users.map((userItem) => (
                          <tr key={userItem.id}>
                            <td>{userItem.username}</td>
                            <td>{userItem.full_name || '-'}</td>
                            <td>{userItem.email}</td>
                            <td>{userItem.role}</td>
                            <td>
                              <span className={`badge ${userItem.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                {userItem.is_active ? '启用' : '禁用'}
                              </span>
                            </td>
                            <td>{formatDate(userItem.created_at)}</td>
                            <td className="text-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleOpenEditModal(userItem)}
                              >
                                编辑
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={handleCloseCreateModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>创建新用户</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitCreate}>
          <Modal.Body>
            <Form.Group controlId="createUsername" className="mb-3">
              <Form.Label>用户名</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={createFormValues.username}
                onChange={handleCreateInputChange}
                required
                minLength={3}
              />
            </Form.Group>

            <Form.Group controlId="createEmail" className="mb-3">
              <Form.Label>邮箱</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={createFormValues.email}
                onChange={handleCreateInputChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="createPassword" className="mb-3">
              <Form.Label>密码</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={createFormValues.password}
                onChange={handleCreateInputChange}
                required
                minLength={8}
              />
            </Form.Group>

            <Form.Group controlId="createFullName" className="mb-3">
              <Form.Label>姓名</Form.Label>
              <Form.Control
                type="text"
                name="full_name"
                value={createFormValues.full_name}
                onChange={handleCreateInputChange}
              />
            </Form.Group>

            <Form.Group controlId="createRole">
              <Form.Label>角色</Form.Label>
              <Form.Select name="role" value={createFormValues.role} onChange={handleCreateInputChange}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseCreateModal} disabled={actionLoading === 'create'}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading === 'create'}>
              {actionLoading === 'create' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  创建中...
                </>
              ) : (
                '创建'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>编辑用户</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitEdit}>
          <Modal.Body>
            <Form.Group controlId="editRole" className="mb-3">
              <Form.Label>角色</Form.Label>
              <Form.Select name="role" value={editFormValues.role} onChange={handleEditInputChange}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="editPassword" className="mb-3">
              <Form.Label>新密码 (可选)</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={editFormValues.password}
                onChange={handleEditInputChange}
                placeholder="留空则不修改密码"
                minLength={8}
              />
              <Form.Text className="text-muted">
                如需修改密码，请输入新密码（最少8位）
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="editStatus">
              <Form.Check
                type="switch"
                id="editIsActive"
                name="is_active"
                label="启用账号"
                checked={editFormValues.is_active}
                onChange={handleEditInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-between w-100">
              <Button
                variant="danger"
                onClick={handleOpenDeleteConfirm}
                disabled={actionLoading === 'edit' || actionLoading === 'delete'}
              >
                删除账户
              </Button>
              <div>
                <Button
                  variant="secondary"
                  onClick={handleCloseEditModal}
                  disabled={actionLoading === 'edit' || actionLoading === 'delete'}
                  className="me-2"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoading === 'edit' || actionLoading === 'delete'}
                >
                  {actionLoading === 'edit' ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal show={showDeleteConfirm} onHide={handleCloseDeleteConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>确认删除用户</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div>
              <p className="mb-2">您确定要删除以下用户吗？</p>
              <div className="alert alert-warning">
                <strong>用户名：</strong> {selectedUser.username}
                <br />
                <strong>邮箱：</strong> {selectedUser.email}
              </div>
              <p className="text-danger mb-0">
                <strong>警告：</strong>此操作不可撤销！
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDeleteConfirm}
            disabled={actionLoading === 'delete'}
          >
            取消
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={actionLoading === 'delete'}
          >
            {actionLoading === 'delete' ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                删除中...
              </>
            ) : (
              '确认删除'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UsersPage;
