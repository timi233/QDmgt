import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Table,
  Modal,
  Form,
  Spinner,
  Badge,
} from 'react-bootstrap';
import {
  assignmentService,
  Assignment as AssignmentEntity,
  PermissionLevel,
} from '../services/assignment.service';
import { channelService } from '../services/channel.service';
import authService, { User } from '../services/auth.service';
import { Channel } from '../types';
import { formatDate } from '../utils/dateFormatter';

type AssignmentCreateFormValues = {
  user_id: string;
  channel_id: string;
  permission_level: '' | PermissionLevel;
  target_responsibility: boolean;
};

type AssignmentEditFormValues = {
  permission_level: '' | PermissionLevel;
  target_responsibility: boolean;
};

type AssignmentCreateFormErrors = Partial<Record<'user_id' | 'channel_id' | 'permission_level', string>>;

type AssignmentEditFormErrors = Partial<Record<'permission_level', string>>;

const createInitialCreateFormValues = (): AssignmentCreateFormValues => ({
  user_id: '',
  channel_id: '',
  permission_level: 'read',
  target_responsibility: false,
});

const createInitialEditFormValues = (): AssignmentEditFormValues => ({
  permission_level: '',
  target_responsibility: false,
});

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
};


const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentEntity[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentEntity | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentEntity | null>(null);
  const [createFormData, setCreateFormData] = useState<AssignmentCreateFormValues>(() => createInitialCreateFormValues());
  const [editFormData, setEditFormData] = useState<AssignmentEditFormValues>(() => createInitialEditFormValues());
  const [createFormErrors, setCreateFormErrors] = useState<AssignmentCreateFormErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<AssignmentEditFormErrors>({});
  const [actionLoading, setActionLoading] = useState<null | 'create' | 'edit' | 'delete'>(null);

  const channelMap = useMemo(() => {
    return channels.reduce<Record<string, Channel>>((acc, channel) => {
      acc[channel.id] = channel;
      return acc;
    }, {});
  }, [channels]);

  const userMap = useMemo(() => {
    return users.reduce<Record<string, User>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);

  const getUserDisplayName = (userId: string): string => {
    const user = userMap[userId];
    if (!user) {
      return userId;
    }

    return user.full_name ? `${user.full_name}（${user.username}）` : user.username;
  };

  const getChannelDisplayName = (channelId: string): string => {
    const channel = channelMap[channelId];
    return channel ? channel.name : channelId;
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const channelResponse = await channelService.getChannels({ limit: 500 });
      setChannels(channelResponse.channels);

      try {
        const userList = await authService.getUsers();
        setUsers(userList);
      } catch (userError) {
        console.error('[Assignments] Failed to load users', userError);
      }

      const assignmentArrays = await Promise.all(
        channelResponse.channels.map(async channel => {
          const channelAssignments = await assignmentService.getAssignmentsByChannel(channel.id);
          return channelAssignments;
        })
      );

      const flattened = assignmentArrays.flat();
      setAssignments(flattened);
      setSuccessMessage(null);
    } catch (err) {
      const message = getErrorMessage(err, '加载分配数据失败');
      setError(message);
      console.error('[Assignments] Fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments().catch(error => {
      console.error('[Assignments] Initial load failed', error);
    });
  }, [fetchAssignments]);

  useEffect(() => {
    if (selectedAssignment) {
      setEditFormData({
        permission_level: selectedAssignment.permission_level,
        target_responsibility: selectedAssignment.target_responsibility,
      });
      setEditFormErrors({});
    } else {
      setEditFormData(createInitialEditFormValues());
    }
  }, [selectedAssignment]);

  const validateCreateForm = (formValues: AssignmentCreateFormValues): boolean => {
    const errors: AssignmentCreateFormErrors = {};

    if (!formValues.user_id) {
      errors.user_id = '请选择用户';
    }

    if (!formValues.channel_id) {
      errors.channel_id = '请选择渠道';
    }

    if (!formValues.permission_level) {
      errors.permission_level = '请选择权限级别';
    }

    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (formValues: AssignmentEditFormValues): boolean => {
    const errors: AssignmentEditFormErrors = {};

    if (!formValues.permission_level) {
      errors.permission_level = '请选择权限级别';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    setCreateFormData(createInitialCreateFormValues());
    setCreateFormErrors({});
    setShowCreateModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedAssignment(null);
    setCreateFormData(createInitialCreateFormValues());
    setEditFormData(createInitialEditFormValues());
    setCreateFormErrors({});
    setEditFormErrors({});
  };

  const handleOpenEditModal = (assignment: AssignmentEntity) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const handleConfirmDelete = (assignment: AssignmentEntity) => {
    setAssignmentToDelete(assignment);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setAssignmentToDelete(null);
    setShowDeleteModal(false);
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCreateForm(createFormData)) {
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      await assignmentService.createAssignment(
        createFormData.user_id,
        createFormData.channel_id,
        createFormData.permission_level as PermissionLevel,
        createFormData.target_responsibility
      );

      setShowCreateModal(false);
      setCreateFormData(createInitialCreateFormValues());

      await fetchAssignments();
      setSuccessMessage('分配已成功创建');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '创建分配失败');
      setError(message);
      console.error('[Assignments] Create failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAssignment) {
      return;
    }

    if (!validateEditForm(editFormData)) {
      return;
    }

    setActionLoading('edit');
    setError(null);

    try {
      await assignmentService.updateAssignment(selectedAssignment.id, {
        permission_level: editFormData.permission_level as PermissionLevel,
        target_responsibility: editFormData.target_responsibility,
      });

      setShowEditModal(false);
      setSelectedAssignment(null);

      await fetchAssignments();
      setSuccessMessage('分配已成功更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新分配失败');
      setError(message);
      console.error('[Assignments] Update failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) {
      return;
    }

    setActionLoading('delete');
    setError(null);

    try {
      await assignmentService.deleteAssignment(assignmentToDelete.id);

      setShowDeleteModal(false);
      setAssignmentToDelete(null);

      await fetchAssignments();
      setSuccessMessage('分配已成功删除');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '删除分配失败');
      setError(message);
      console.error('[Assignments] Delete failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const permissionLevelLabel = (level: PermissionLevel): string => {
    switch (level) {
      case 'admin':
        return '管理员';
      case 'write':
        return '编辑';
      case 'read':
      default:
        return '只读';
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title>分配管理</Card.Title>
              <Button variant="primary" className="float-end" onClick={handleOpenCreateModal}>
                创建分配
              </Button>
            </Card.Header>
            <Card.Body>
              {successMessage && (
                <Alert
                  variant="success"
                  dismissible
                  onClose={() => setSuccessMessage(null)}
                  className="mb-3"
                >
                  {successMessage}
                </Alert>
              )}
              {error && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setError(null)}
                  className="mb-3"
                >
                  {error}
                </Alert>
              )}
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>渠道</th>
                    <th>权限级别</th>
                    <th>目标责任</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        正在加载分配数据...
                      </td>
                    </tr>
                  ) : assignments.length > 0 ? (
                    assignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td>{getUserDisplayName(assignment.user_id)}</td>
                        <td>{getChannelDisplayName(assignment.channel_id)}</td>
                        <td>
                          <Badge bg="info" className="text-uppercase">
                            {permissionLevelLabel(assignment.permission_level)}
                          </Badge>
                        </td>
                        <td>{assignment.target_responsibility ? '是' : '否'}</td>
                        <td>
                          {formatDate(assignment.updated_at || assignment.created_at)}
                        </td>
                        <td>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleOpenEditModal(assignment)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleConfirmDelete(assignment)}
                          >
                            删除
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        暂无分配数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <Modal show={showCreateModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>创建分配</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form id="createAssignmentForm" onSubmit={handleSubmitCreate}>
                    <Form.Group className="mb-3" controlId="createAssignmentUser">
                      <Form.Label>用户</Form.Label>
                      <Form.Select
                        value={createFormData.user_id}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, user_id: event.target.value }))
                        }
                        isInvalid={!!createFormErrors.user_id}
                        required
                      >
                        <option value="">请选择用户</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.username}（{user.username}）
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.user_id}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createAssignmentChannel">
                      <Form.Label>渠道</Form.Label>
                      <Form.Select
                        value={createFormData.channel_id}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, channel_id: event.target.value }))
                        }
                        isInvalid={!!createFormErrors.channel_id}
                        required
                      >
                        <option value="">请选择渠道</option>
                        {channels.map(channel => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.channel_id}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createAssignmentPermission">
                      <Form.Label>权限级别(默认:只读)</Form.Label>
                      <Form.Select
                        value={createFormData.permission_level}
                        onChange={event =>
                          setCreateFormData(prev => ({
                            ...prev,
                            permission_level: event.target.value as AssignmentCreateFormValues['permission_level'],
                          }))
                        }
                        isInvalid={!!createFormErrors.permission_level}
                        required
                      >
                        <option value="read">只读</option>
                        <option value="write">编辑</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.permission_level}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createAssignmentResponsibility">
                      <Form.Check
                        type="switch"
                        label="承担渠道目标责任"
                        checked={createFormData.target_responsibility}
                        onChange={event =>
                          setCreateFormData(prev => ({
                            ...prev,
                            target_responsibility: event.target.checked,
                          }))
                        }
                      />
                    </Form.Group>
                  </Form>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModals}
                    disabled={actionLoading === 'create'}
                  >
                    关闭
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="createAssignmentForm"
                    disabled={actionLoading === 'create'}
                  >
                    {actionLoading === 'create' ? (
                      <>
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal>

              <Modal show={showEditModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>编辑分配</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {selectedAssignment ? (
                    <Form id="editAssignmentForm" onSubmit={handleSubmitEdit}>
                      <Form.Group className="mb-3" controlId="editAssignmentUser">
                        <Form.Label>用户</Form.Label>
                          <Form.Control
                            type="text"
                            value={getUserDisplayName(selectedAssignment.user_id)}
                            readOnly
                            plaintext
                          />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editAssignmentChannel">
                        <Form.Label>渠道</Form.Label>
                          <Form.Control
                            type="text"
                            value={getChannelDisplayName(selectedAssignment.channel_id)}
                            readOnly
                            plaintext
                          />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editAssignmentPermission">
                        <Form.Label>权限级别</Form.Label>
                        <Form.Select
                          value={editFormData.permission_level}
                          onChange={event =>
                            setEditFormData(prev => ({
                              ...prev,
                              permission_level: event.target.value as AssignmentEditFormValues['permission_level'],
                            }))
                          }
                          isInvalid={!!editFormErrors.permission_level}
                          required
                        >
                          <option value="">请选择权限级别</option>
                          <option value="read">只读</option>
                          <option value="write">编辑</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.permission_level}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editAssignmentResponsibility">
                        <Form.Check
                          type="switch"
                          label="承担渠道目标责任"
                          checked={editFormData.target_responsibility}
                          onChange={event =>
                            setEditFormData(prev => ({
                              ...prev,
                              target_responsibility: event.target.checked,
                            }))
                          }
                        />
                      </Form.Group>
                    </Form>
                  ) : (
                    <p>未选中任何分配。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModals}
                    disabled={actionLoading === 'edit'}
                  >
                    关闭
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="editAssignmentForm"
                    disabled={!selectedAssignment || actionLoading === 'edit'}
                  >
                    {actionLoading === 'edit' ? (
                      <>
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal>

              <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
                <Modal.Header closeButton>
                  <Modal.Title>删除分配</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {assignmentToDelete ? (
                    <p>
                      确认删除用户
                      <strong className="mx-1">{getUserDisplayName(assignmentToDelete.user_id)}</strong>
                      在渠道
                      <strong className="mx-1">{getChannelDisplayName(assignmentToDelete.channel_id)}</strong>
                      的分配吗？此操作不可撤销。
                    </p>
                  ) : (
                    <p>未选中任何分配。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={handleCloseDeleteModal}
                    disabled={actionLoading === 'delete'}
                  >
                    取消
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteAssignment}
                    disabled={!assignmentToDelete || actionLoading === 'delete'}
                  >
                    {actionLoading === 'delete' ? (
                      <>
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        删除中...
                      </>
                    ) : (
                      '删除'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AssignmentsPage;
