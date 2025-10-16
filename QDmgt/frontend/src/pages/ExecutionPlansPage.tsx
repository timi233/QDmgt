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
import { channelService } from '../services/channel.service';
import authService, { User } from '../services/auth.service';
import {
  executionService,
  ExecutionPlan,
  PlanType,
  ExecutionStatus,
} from '../services/execution.service';
import { assignmentService, Assignment } from '../services/assignment.service';
import { Channel } from '../types';

type ExecutionPlanCreateFormValues = {
  channel_id: string;
  user_id: string;
  plan_type: '' | PlanType;
  plan_period: string;
  plan_content: string;
  key_obstacles: string;
  next_steps: string;
};

type ExecutionPlanEditFormValues = ExecutionPlanCreateFormValues & {
  execution_status: '' | ExecutionStatus;
};

type ExecutionPlanStatusFormValues = {
  execution_status: '' | ExecutionStatus;
  key_obstacles: string;
  next_steps: string;
};

type ExecutionPlanCreateErrors = Partial<
  Record<'channel_id' | 'user_id' | 'plan_type' | 'plan_period' | 'plan_content', string>
>;

type ExecutionPlanEditErrors = ExecutionPlanCreateErrors & Partial<Record<'execution_status', string>>;

type ExecutionPlanStatusErrors = Partial<Record<'execution_status', string>>;

const createInitialCreateFormValues = (): ExecutionPlanCreateFormValues => ({
  channel_id: '',
  user_id: '',
  plan_type: '',
  plan_period: '',
  plan_content: '',
  key_obstacles: '',
  next_steps: '',
});

const createInitialEditFormValues = (): ExecutionPlanEditFormValues => ({
  ...createInitialCreateFormValues(),
  execution_status: '',
  key_obstacles: '',
  next_steps: '',
});

const createInitialStatusFormValues = (): ExecutionPlanStatusFormValues => ({
  execution_status: '',
  key_obstacles: '',
  next_steps: '',
});

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      // 如果错误信息包含日期格式相关的问题，提供友好提示
      if (message.includes('plan_period') || message.includes('period') || message.includes('format')) {
        return '请使用正确的日期格式，例如：2025-Q1（季度）、2025-03（月度）或 2025-W12（周）';
      }
      return message;
    }
  }

  return fallback;
};

const planTypeLabel = (type: PlanType): string => {
  switch (type) {
    case 'weekly':
      return '周计划';
    case 'monthly':
    default:
      return '月度计划';
  }
};

const executionStatusLabel = (status: ExecutionStatus): string => {
  switch (status) {
    case 'planned':
      return '计划中';
    case 'in-progress':
      return '执行中';
    case 'completed':
      return '已完成';
    case 'archived':
    default:
      return '已归档';
  }
};

const executionStatusVariant = (status: ExecutionStatus): string => {
  switch (status) {
    case 'planned':
      return 'secondary';
    case 'in-progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'archived':
    default:
      return 'dark';
  }
};

const ExecutionPlansPage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [plans, setPlans] = useState<ExecutionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planForEdit, setPlanForEdit] = useState<ExecutionPlan | null>(null);
  const [planForStatus, setPlanForStatus] = useState<ExecutionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<ExecutionPlan | null>(null);
  const [createFormData, setCreateFormData] = useState<ExecutionPlanCreateFormValues>(() => createInitialCreateFormValues());
  const [editFormData, setEditFormData] = useState<ExecutionPlanEditFormValues>(() => createInitialEditFormValues());
  const [statusFormData, setStatusFormData] = useState<ExecutionPlanStatusFormValues>(() => createInitialStatusFormValues());
  const [createFormErrors, setCreateFormErrors] = useState<ExecutionPlanCreateErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<ExecutionPlanEditErrors>({});
  const [statusFormErrors, setStatusFormErrors] = useState<ExecutionPlanStatusErrors>({});
  const [actionLoading, setActionLoading] = useState<null | 'create' | 'edit' | 'status' | 'delete'>(null);

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

  const channelAssignmentsMap = useMemo(() => {
    return assignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      if (!acc[assignment.channel_id]) {
        acc[assignment.channel_id] = [];
      }
      acc[assignment.channel_id].push(assignment);
      return acc;
    }, {});
  }, [assignments]);

  const getUserDisplayName = (userId: string): string => {
    const user = userMap[userId];
    if (!user) {
      return userId;
    }

    return user.full_name ? `${user.full_name}（${user.username}）` : user.username;
  };

  const getChannelResponsibleUser = (channelId: string): string | null => {
    const channelAssignments = channelAssignmentsMap[channelId] || [];
    // 优先查找承担目标的用户
    const responsibleAssignment = channelAssignments.find(a => a.target_responsibility);
    if (responsibleAssignment) {
      return responsibleAssignment.user_id;
    }
    // 如果没有承担目标的，返回第一个分配的用户
    return channelAssignments.length > 0 ? channelAssignments[0].user_id : null;
  };

  const fetchExecutionPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const channelResponse = await channelService.getChannels({ limit: 500 });
      setChannels(channelResponse.channels);

      try {
        const userList = await authService.getUsers();
        setUsers(userList);
      } catch (userError) {
        console.error('[ExecutionPlans] Failed to load users', userError);
      }

      // 加载所有渠道的分配关系
      try {
        const assignmentArrays = await Promise.all(
          channelResponse.channels.map(async channel => {
            const channelAssignments = await assignmentService.getAssignmentsByChannel(channel.id);
            return channelAssignments;
          })
        );
        setAssignments(assignmentArrays.flat());
      } catch (assignmentError) {
        console.error('[ExecutionPlans] Failed to load assignments', assignmentError);
      }

      const planArrays = await Promise.all(
        channelResponse.channels.map(async channel => {
          const channelPlans = await executionService.getExecutionPlansByChannel(channel.id);
          return channelPlans;
        })
      );

      setPlans(planArrays.flat());
      setSuccessMessage(null);
    } catch (err) {
      const message = getErrorMessage(err, '加载执行计划数据失败');
      setError(message);
      console.error('[ExecutionPlans] Fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutionPlans().catch(error => {
      console.error('[ExecutionPlans] Initial load failed', error);
    });
  }, [fetchExecutionPlans]);

  useEffect(() => {
    if (planForEdit) {
      setEditFormData({
        channel_id: planForEdit.channel_id,
        user_id: planForEdit.user_id,
        plan_type: planForEdit.plan_type,
        plan_period: planForEdit.plan_period,
        plan_content: planForEdit.plan_content,
        execution_status: planForEdit.execution_status,
        key_obstacles: planForEdit.key_obstacles || '',
        next_steps: planForEdit.next_steps || '',
      });
      setEditFormErrors({});
    } else {
      setEditFormData(createInitialEditFormValues());
    }
  }, [planForEdit]);

  useEffect(() => {
    if (planForStatus) {
      setStatusFormData({
        execution_status: planForStatus.execution_status,
        key_obstacles: planForStatus.key_obstacles || '',
        next_steps: planForStatus.next_steps || '',
      });
      setStatusFormErrors({});
    } else {
      setStatusFormData(createInitialStatusFormValues());
    }
  }, [planForStatus]);

  // 监听创建表单渠道选择变化，自动填充负责人
  useEffect(() => {
    if (createFormData.channel_id && assignments.length > 0) {
      const channelAssignments = channelAssignmentsMap[createFormData.channel_id] || [];
      // 优先查找承担目标的用户
      const responsibleAssignment = channelAssignments.find(a => a.target_responsibility);
      const responsibleUserId = responsibleAssignment
        ? responsibleAssignment.user_id
        : (channelAssignments.length > 0 ? channelAssignments[0].user_id : null);

      if (responsibleUserId) {
        setCreateFormData(prev => ({ ...prev, user_id: responsibleUserId }));
      }
    }
  }, [createFormData.channel_id, channelAssignmentsMap, assignments.length]);

  // 监听编辑表单渠道选择变化，自动填充负责人
  useEffect(() => {
    if (editFormData.channel_id && !planForEdit && assignments.length > 0) {
      const channelAssignments = channelAssignmentsMap[editFormData.channel_id] || [];
      // 优先查找承担目标的用户
      const responsibleAssignment = channelAssignments.find(a => a.target_responsibility);
      const responsibleUserId = responsibleAssignment
        ? responsibleAssignment.user_id
        : (channelAssignments.length > 0 ? channelAssignments[0].user_id : null);

      if (responsibleUserId) {
        setEditFormData(prev => ({ ...prev, user_id: responsibleUserId }));
      }
    }
  }, [editFormData.channel_id, planForEdit, channelAssignmentsMap, assignments.length]);

  const buildCreateErrors = (formValues: ExecutionPlanCreateFormValues): ExecutionPlanCreateErrors => {
    const errors: ExecutionPlanCreateErrors = {};

    if (!formValues.channel_id) {
      errors.channel_id = '请选择渠道';
    }

    if (!formValues.user_id) {
      errors.user_id = '请选择负责人';
    }

    if (!formValues.plan_type) {
      errors.plan_type = '请选择计划类型';
    }

    if (!formValues.plan_period.trim()) {
      errors.plan_period = '请输入计划周期';
    } else {
      // 验证日期格式
      const period = formValues.plan_period.trim();
      const quarterPattern = /^\d{4}-Q[1-4]$/; // 例如：2025-Q1
      const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/; // 例如：2025-03
      const weekPattern = /^\d{4}-W([0-4][0-9]|5[0-3])$/; // 例如：2025-W12

      if (formValues.plan_type === 'monthly') {
        if (!quarterPattern.test(period) && !monthPattern.test(period)) {
          errors.plan_period = '请使用正确的格式，例如：2025-Q1（季度）或 2025-03（月度）';
        }
      } else if (formValues.plan_type === 'weekly') {
        if (!weekPattern.test(period) && !monthPattern.test(period)) {
          errors.plan_period = '请使用正确的格式，例如：2025-W12（周）或 2025-03（月度）';
        }
      }
    }

    if (!formValues.plan_content.trim()) {
      errors.plan_content = '请输入计划内容';
    }

    return errors;
  };

  const validateCreateForm = (formValues: ExecutionPlanCreateFormValues): boolean => {
    const errors = buildCreateErrors(formValues);
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (formValues: ExecutionPlanEditFormValues): boolean => {
    const baseErrors = buildCreateErrors(formValues);
    const errors: ExecutionPlanEditErrors = { ...baseErrors };

    if (!formValues.execution_status) {
      errors.execution_status = '请选择执行状态';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStatusForm = (formValues: ExecutionPlanStatusFormValues): boolean => {
    const errors: ExecutionPlanStatusErrors = {};

    if (!formValues.execution_status) {
      errors.execution_status = '请选择执行状态';
    }

    setStatusFormErrors(errors);
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
    setShowStatusModal(false);
    setShowDeleteModal(false);
    setPlanForEdit(null);
    setPlanForStatus(null);
    setPlanToDelete(null);
    setCreateFormData(createInitialCreateFormValues());
    setEditFormData(createInitialEditFormValues());
    setStatusFormData(createInitialStatusFormValues());
    setCreateFormErrors({});
    setEditFormErrors({});
    setStatusFormErrors({});
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCreateForm(createFormData)) {
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      await executionService.createExecutionPlan(
        createFormData.channel_id,
        createFormData.user_id,
        createFormData.plan_type as PlanType,
        createFormData.plan_period,
        createFormData.plan_content,
        createFormData.key_obstacles || undefined,
        createFormData.next_steps || undefined
      );

      setShowCreateModal(false);
      setCreateFormData(createInitialCreateFormValues());

      await fetchExecutionPlans();
      setSuccessMessage('执行计划已成功创建');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '创建执行计划失败');
      setError(message);
      console.error('[ExecutionPlans] Create failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!planForEdit) {
      return;
    }

    if (!validateEditForm(editFormData)) {
      return;
    }

    setActionLoading('edit');
    setError(null);

    try {
      await executionService.updateExecutionPlan(planForEdit.id, {
        channel_id: editFormData.channel_id,
        user_id: editFormData.user_id,
        plan_type: editFormData.plan_type as PlanType,
        plan_period: editFormData.plan_period,
        plan_content: editFormData.plan_content,
        execution_status: editFormData.execution_status as ExecutionStatus,
        key_obstacles: editFormData.key_obstacles || undefined,
        next_steps: editFormData.next_steps || undefined,
      });

      setShowEditModal(false);
      setPlanForEdit(null);

      await fetchExecutionPlans();
      setSuccessMessage('执行计划已成功更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新执行计划失败');
      setError(message);
      console.error('[ExecutionPlans] Update failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!planForStatus) {
      return;
    }

    if (!validateStatusForm(statusFormData)) {
      return;
    }

    setActionLoading('status');
    setError(null);

    try {
      await executionService.updateExecutionStatus(planForStatus.id, {
        execution_status: statusFormData.execution_status as ExecutionStatus,
        key_obstacles: statusFormData.key_obstacles || undefined,
        next_steps: statusFormData.next_steps || undefined,
      });

      setShowStatusModal(false);
      setPlanForStatus(null);

      await fetchExecutionPlans();
      setSuccessMessage('执行状态已更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新执行状态失败');
      setError(message);
      console.error('[ExecutionPlans] Status update failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) {
      return;
    }

    setActionLoading('delete');
    setError(null);

    try {
      await executionService.deleteExecutionPlan(planToDelete.id);

      setShowDeleteModal(false);
      setPlanToDelete(null);

      await fetchExecutionPlans();
      setSuccessMessage('执行计划已删除');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '删除执行计划失败');
      setError(message);
      console.error('[ExecutionPlans] Delete failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title>执行计划</Card.Title>
              <Button variant="primary" className="float-end" onClick={handleOpenCreateModal}>
                创建计划
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
                    <th>渠道</th>
                    <th>负责人</th>
                    <th>计划类型</th>
                    <th>周期</th>
                    <th>内容</th>
                    <th>关键障碍</th>
                    <th>下一步行动</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4">
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        正在加载执行计划...
                      </td>
                    </tr>
                  ) : plans.length > 0 ? (
                    plans.map(plan => (
                      <tr key={plan.id}>
                        <td>{channelMap[plan.channel_id]?.name || plan.channel_id}</td>
                        <td>{getUserDisplayName(plan.user_id)}</td>
                        <td>{planTypeLabel(plan.plan_type)}</td>
                        <td>{plan.plan_period}</td>
                        <td className="text-truncate" style={{ maxWidth: '200px' }} title={plan.plan_content}>
                          {plan.plan_content}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '180px' }} title={plan.key_obstacles || ''}>
                          {plan.key_obstacles || '-'}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '180px' }} title={plan.next_steps || ''}>
                          {plan.next_steps || '-'}
                        </td>
                        <td>
                          <Badge bg={executionStatusVariant(plan.execution_status)}>
                            {executionStatusLabel(plan.execution_status)}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex flex-column flex-lg-row gap-2">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => {
                                setPlanForEdit(plan);
                                setShowEditModal(true);
                              }}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setPlanForStatus(plan);
                                setShowStatusModal(true);
                              }}
                            >
                              更新状态
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setPlanToDelete(plan);
                                setShowDeleteModal(true);
                              }}
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        暂无执行计划
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <Modal show={showCreateModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>创建执行计划</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form id="createPlanForm" onSubmit={handleSubmitCreate}>
                    <Form.Group className="mb-3" controlId="createPlanChannel">
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

                    <Form.Group className="mb-3" controlId="createPlanUser">
                      <Form.Label>负责人（自动选择）</Form.Label>
                      <Form.Control
                        type="text"
                        value={createFormData.user_id ? getUserDisplayName(createFormData.user_id) : '请先选择渠道'}
                        readOnly
                        isInvalid={!!createFormErrors.user_id}
                        className="bg-light"
                      />
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.user_id}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        自动选择该渠道的负责人
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createPlanType">
                      <Form.Label>计划类型</Form.Label>
                      <Form.Select
                        value={createFormData.plan_type}
                        onChange={event =>
                          setCreateFormData(prev => ({
                            ...prev,
                            plan_type: event.target.value as ExecutionPlanCreateFormValues['plan_type'],
                          }))
                        }
                        isInvalid={!!createFormErrors.plan_type}
                        required
                      >
                        <option value="">请选择类型</option>
                        <option value="monthly">月度计划</option>
                        <option value="weekly">周计划</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.plan_type}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createPlanPeriod">
                      <Form.Label>计划周期</Form.Label>
                      <Form.Control
                        type="text"
                        value={createFormData.plan_period}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, plan_period: event.target.value }))
                        }
                        isInvalid={!!createFormErrors.plan_period}
                        placeholder={createFormData.plan_type === 'weekly' ? '例如：2025-W12 或 2025-03' : '例如：2025-Q1 或 2025-03'}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.plan_period}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        {createFormData.plan_type === 'weekly'
                          ? '周计划格式：YYYY-W## (如 2025-W12) 或 YYYY-MM (如 2025-03)'
                          : '月度计划格式：YYYY-Q# (如 2025-Q1) 或 YYYY-MM (如 2025-03)'}
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createPlanContent">
                      <Form.Label>计划内容</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={createFormData.plan_content}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, plan_content: event.target.value }))
                        }
                        isInvalid={!!createFormErrors.plan_content}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {createFormErrors.plan_content}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="createPlanObstacles">
                      <Form.Label>关键障碍</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={createFormData.key_obstacles}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, key_obstacles: event.target.value }))
                        }
                      />
                    </Form.Group>

                    <Form.Group className="mb-0" controlId="createPlanNextSteps">
                      <Form.Label>下一步行动</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={createFormData.next_steps}
                        onChange={event =>
                          setCreateFormData(prev => ({ ...prev, next_steps: event.target.value }))
                        }
                      />
                    </Form.Group>
                  </Form>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={handleCloseModals} disabled={actionLoading === 'create'}>
                    关闭
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="createPlanForm"
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
                  <Modal.Title>编辑执行计划</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {planForEdit ? (
                    <Form id="editPlanForm" onSubmit={handleSubmitEdit}>
                      <Form.Group className="mb-3" controlId="editPlanChannel">
                        <Form.Label>渠道</Form.Label>
                        <Form.Select
                          value={editFormData.channel_id}
                          onChange={event =>
                            setEditFormData(prev => ({ ...prev, channel_id: event.target.value }))
                          }
                          isInvalid={!!editFormErrors.channel_id}
                          required
                        >
                          {channels.map(channel => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.channel_id}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanUser">
                        <Form.Label>负责人（自动选择）</Form.Label>
                        <Form.Control
                          type="text"
                          value={editFormData.user_id ? getUserDisplayName(editFormData.user_id) : '请先选择渠道'}
                          readOnly
                          isInvalid={!!editFormErrors.user_id}
                          className="bg-light"
                        />
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.user_id}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          自动选择该渠道的负责人
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanType">
                        <Form.Label>计划类型</Form.Label>
                        <Form.Select
                          value={editFormData.plan_type}
                          onChange={event =>
                            setEditFormData(prev => ({
                              ...prev,
                              plan_type: event.target.value as ExecutionPlanEditFormValues['plan_type'],
                            }))
                          }
                          isInvalid={!!editFormErrors.plan_type}
                          required
                        >
                          <option value="monthly">月度计划</option>
                          <option value="weekly">周计划</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.plan_type}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanPeriod">
                        <Form.Label>计划周期</Form.Label>
                        <Form.Control
                          type="text"
                          value={editFormData.plan_period}
                          onChange={event =>
                            setEditFormData(prev => ({ ...prev, plan_period: event.target.value }))
                          }
                          isInvalid={!!editFormErrors.plan_period}
                          placeholder={editFormData.plan_type === 'weekly' ? '例如：2025-W12 或 2025-03' : '例如：2025-Q1 或 2025-03'}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.plan_period}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          {editFormData.plan_type === 'weekly'
                            ? '周计划格式：YYYY-W## (如 2025-W12) 或 YYYY-MM (如 2025-03)'
                            : '月度计划格式：YYYY-Q# (如 2025-Q1) 或 YYYY-MM (如 2025-03)'}
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanContent">
                        <Form.Label>计划内容</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={editFormData.plan_content}
                          onChange={event =>
                            setEditFormData(prev => ({ ...prev, plan_content: event.target.value }))
                          }
                          isInvalid={!!editFormErrors.plan_content}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.plan_content}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanStatus">
                        <Form.Label>执行状态</Form.Label>
                        <Form.Select
                          value={editFormData.execution_status}
                          onChange={event =>
                            setEditFormData(prev => ({
                              ...prev,
                              execution_status: event.target.value as ExecutionPlanEditFormValues['execution_status'],
                            }))
                          }
                          isInvalid={!!editFormErrors.execution_status}
                          required
                        >
                          <option value="planned">计划中</option>
                          <option value="in-progress">执行中</option>
                          <option value="completed">已完成</option>
                          <option value="archived">已归档</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {editFormErrors.execution_status}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="editPlanObstacles">
                        <Form.Label>关键障碍</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editFormData.key_obstacles}
                          onChange={event =>
                            setEditFormData(prev => ({ ...prev, key_obstacles: event.target.value }))
                          }
                        />
                      </Form.Group>

                      <Form.Group className="mb-0" controlId="editPlanNextSteps">
                        <Form.Label>下一步行动</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editFormData.next_steps}
                          onChange={event =>
                            setEditFormData(prev => ({ ...prev, next_steps: event.target.value }))
                          }
                        />
                      </Form.Group>
                    </Form>
                  ) : (
                    <p>未选中任何执行计划。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={handleCloseModals} disabled={actionLoading === 'edit'}>
                    关闭
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="editPlanForm"
                    disabled={!planForEdit || actionLoading === 'edit'}
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

              <Modal show={showStatusModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>更新执行状态</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {planForStatus ? (
                    <Form id="statusForm" onSubmit={handleSubmitStatus}>
                      <Form.Group className="mb-3" controlId="statusExecution">
                        <Form.Label>执行状态</Form.Label>
                        <Form.Select
                          value={statusFormData.execution_status}
                          onChange={event =>
                            setStatusFormData(prev => ({
                              ...prev,
                              execution_status: event.target.value as ExecutionPlanStatusFormValues['execution_status'],
                            }))
                          }
                          isInvalid={!!statusFormErrors.execution_status}
                          required
                        >
                          <option value="planned">计划中</option>
                          <option value="in-progress">执行中</option>
                          <option value="completed">已完成</option>
                          <option value="archived">已归档</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {statusFormErrors.execution_status}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="statusObstacles">
                        <Form.Label>关键障碍</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={statusFormData.key_obstacles}
                          onChange={event =>
                            setStatusFormData(prev => ({ ...prev, key_obstacles: event.target.value }))
                          }
                        />
                      </Form.Group>

                      <Form.Group className="mb-0" controlId="statusNextSteps">
                        <Form.Label>下一步行动</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={statusFormData.next_steps}
                          onChange={event =>
                            setStatusFormData(prev => ({ ...prev, next_steps: event.target.value }))
                          }
                        />
                      </Form.Group>
                    </Form>
                  ) : (
                    <p>未选中任何执行计划。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModals}
                    disabled={actionLoading === 'status'}
                  >
                    关闭
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="statusForm"
                    disabled={!planForStatus || actionLoading === 'status'}
                  >
                    {actionLoading === 'status' ? (
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

              <Modal show={showDeleteModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>删除执行计划</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {planToDelete ? (
                    <p>
                      确认删除渠道
                      <strong className="mx-1">{channelMap[planToDelete.channel_id]?.name || planToDelete.channel_id}</strong>
                      在周期 <strong>{planToDelete.plan_period}</strong> 的执行计划吗？此操作不可撤销。
                    </p>
                  ) : (
                    <p>未选中任何执行计划。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModals}
                    disabled={actionLoading === 'delete'}
                  >
                    取消
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeletePlan}
                    disabled={!planToDelete || actionLoading === 'delete'}
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

export default ExecutionPlansPage;
