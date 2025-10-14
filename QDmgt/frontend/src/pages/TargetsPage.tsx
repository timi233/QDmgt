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
import {
  targetService,
  TargetPlan,
  TargetMetricsInput,
} from '../services/target.service';
import { Channel } from '../types';

type TargetCreateFormValues = {
  channel_id: string;
  year: string;
  quarter: string;
  month: string;
  performance_target: string;
  opportunity_target: string;
  project_count_target: string;
  development_goal: string;
};

type TargetEditFormValues = TargetCreateFormValues & {
  achieved_performance: string;
  achieved_opportunity: string;
  achieved_project_count: string;
};

type TargetAchievementFormValues = {
  achieved_performance: string;
  achieved_opportunity: string;
  achieved_project_count: string;
};

type TargetCreateFormErrors = Partial<
  Record<
    'channel_id' | 'year' | 'quarter' | 'performance_target' | 'opportunity_target' | 'project_count_target' | 'month',
    string
  >
>;

type TargetEditFormErrors = TargetCreateFormErrors &
  Partial<Record<'achieved_performance' | 'achieved_opportunity' | 'achieved_project_count', string>>;

type TargetAchievementFormErrors = Partial<
  Record<'achieved_performance' | 'achieved_opportunity' | 'achieved_project_count', string>
>;

const createInitialCreateFormValues = (): TargetCreateFormValues => ({
  channel_id: '',
  year: '',
  quarter: '',
  month: '',
  performance_target: '',
  opportunity_target: '',
  project_count_target: '',
  development_goal: '',
});

const createInitialEditFormValues = (): TargetEditFormValues => ({
  ...createInitialCreateFormValues(),
  achieved_performance: '',
  achieved_opportunity: '',
  achieved_project_count: '',
});

const createInitialAchievementFormValues = (): TargetAchievementFormValues => ({
  achieved_performance: '',
  achieved_opportunity: '',
  achieved_project_count: '',
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

const parseNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const formatNumber = (value?: number | null): string => {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
};

const calculateCompletion = (target: TargetPlan): string => {
  const metrics: Array<{ achieved?: number; planned?: number }> = [
    { achieved: target.achieved_performance, planned: target.performance_target },
    { achieved: target.achieved_opportunity, planned: target.opportunity_target },
    { achieved: target.achieved_project_count, planned: target.project_count_target },
  ];

  const completionValues = metrics
    .map(metric => {
      if (!metric.planned || metric.planned <= 0) {
        return null;
      }

      const achieved = typeof metric.achieved === 'number' ? metric.achieved : 0;
      const completion = (achieved / metric.planned) * 100;
      return Math.max(0, Math.min(999, completion));
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (completionValues.length === 0) {
    return '-';
  }

  const average = completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length;
  return `${average.toFixed(1)}%`;
};

const TargetsPage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [targets, setTargets] = useState<TargetPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [targetForEdit, setTargetForEdit] = useState<TargetPlan | null>(null);
  const [targetForAchievement, setTargetForAchievement] = useState<TargetPlan | null>(null);
  const [createFormData, setCreateFormData] = useState<TargetCreateFormValues>(() => createInitialCreateFormValues());
  const [editFormData, setEditFormData] = useState<TargetEditFormValues>(() => createInitialEditFormValues());
  const [achievementFormData, setAchievementFormData] = useState<TargetAchievementFormValues>(() => createInitialAchievementFormValues());
  const [createFormErrors, setCreateFormErrors] = useState<TargetCreateFormErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<TargetEditFormErrors>({});
  const [achievementFormErrors, setAchievementFormErrors] = useState<TargetAchievementFormErrors>({});
  const [actionLoading, setActionLoading] = useState<null | 'create' | 'edit' | 'achievement'>(null);

  const channelMap = useMemo(() => {
    return channels.reduce<Record<string, Channel>>((acc, channel) => {
      acc[channel.id] = channel;
      return acc;
    }, {});
  }, [channels]);

  const businessTypeLabel = (value: Channel['business_type']): string => {
    switch (value) {
      case 'basic':
        return '基本盘渠道';
      case 'high-value':
        return '高价值渠道';
      case 'pending-signup':
      default:
        return '待签约渠道';
    }
  };

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const channelResponse = await channelService.getChannels({ limit: 500 });
      setChannels(channelResponse.channels);

      const targetArrays = await Promise.all(
        channelResponse.channels.map(async channel => {
          const channelTargets = await targetService.getTargetsByChannel(channel.id);
          return channelTargets;
        })
      );

      setTargets(targetArrays.flat());
      setSuccessMessage(null);
    } catch (err) {
      const message = getErrorMessage(err, '加载目标数据失败');
      setError(message);
      console.error('[Targets] Fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets().catch(error => {
      console.error('[Targets] Initial load failed', error);
    });
  }, [fetchTargets]);

  useEffect(() => {
    if (targetForEdit) {
      setEditFormData({
        channel_id: targetForEdit.channel_id,
        year: String(targetForEdit.year),
        quarter: String(targetForEdit.quarter),
        month: formatNumber(targetForEdit.month),
        performance_target: formatNumber(targetForEdit.performance_target),
        opportunity_target: formatNumber(targetForEdit.opportunity_target),
        project_count_target: formatNumber(targetForEdit.project_count_target),
        development_goal: targetForEdit.development_goal || '',
        achieved_performance: formatNumber(targetForEdit.achieved_performance),
        achieved_opportunity: formatNumber(targetForEdit.achieved_opportunity),
        achieved_project_count: formatNumber(targetForEdit.achieved_project_count),
      });
      setEditFormErrors({});
    } else {
      setEditFormData(createInitialEditFormValues());
    }
  }, [targetForEdit]);

  useEffect(() => {
    if (targetForAchievement) {
      setAchievementFormData({
        achieved_performance: formatNumber(targetForAchievement.achieved_performance),
        achieved_opportunity: formatNumber(targetForAchievement.achieved_opportunity),
        achieved_project_count: formatNumber(targetForAchievement.achieved_project_count),
      });
      setAchievementFormErrors({});
    } else {
      setAchievementFormData(createInitialAchievementFormValues());
    }
  }, [targetForAchievement]);

const buildBaseErrors = (formValues: TargetCreateFormValues): TargetCreateFormErrors => {
  const errors: TargetCreateFormErrors = {};

  if (!formValues.channel_id) {
    errors.channel_id = '请选择渠道';
  }

  const yearValue = parseNumber(formValues.year);
  if (yearValue === null || !Number.isInteger(yearValue) || yearValue < 2000 || yearValue > 2100) {
    errors.year = '请输入2000-2100之间的年份';
  }

  const quarterValue = parseNumber(formValues.quarter);
  if (quarterValue === null || ![1, 2, 3, 4].includes(quarterValue)) {
    errors.quarter = '季度必须为1-4';
  }

  if (formValues.month) {
    const monthValue = parseNumber(formValues.month);
    if (monthValue === null || monthValue < 1 || monthValue > 12) {
      errors.month = '月份必须在1-12之间';
    }
  }

  const performanceTarget = parseNumber(formValues.performance_target);
  if (performanceTarget === null || performanceTarget < 0) {
    errors.performance_target = '请输入非负的业绩目标';
  }

  const opportunityTarget = parseNumber(formValues.opportunity_target);
  if (opportunityTarget === null || opportunityTarget < 0) {
    errors.opportunity_target = '请输入非负的商机目标';
  }

  const projectTarget = parseNumber(formValues.project_count_target);
  if (projectTarget === null || projectTarget < 0) {
    errors.project_count_target = '请输入非负的项目数量目标';
  }

  return errors;
};

const validateCreateForm = (formValues: TargetCreateFormValues): boolean => {
  const errors = buildBaseErrors(formValues);
  setCreateFormErrors(errors);
  return Object.keys(errors).length === 0;
};

const validateEditForm = (formValues: TargetEditFormValues): boolean => {
  const baseErrors = buildBaseErrors(formValues);
  const errors: TargetEditFormErrors = { ...baseErrors };

  const achievedPerformance = formValues.achieved_performance.trim();
  if (achievedPerformance && parseNumber(achievedPerformance) === null) {
    errors.achieved_performance = '请输入有效的数值';
  }

  const achievedOpportunity = formValues.achieved_opportunity.trim();
  if (achievedOpportunity && parseNumber(achievedOpportunity) === null) {
    errors.achieved_opportunity = '请输入有效的数值';
  }

  const achievedProject = formValues.achieved_project_count.trim();
  if (achievedProject && parseNumber(achievedProject) === null) {
    errors.achieved_project_count = '请输入有效的数值';
  }

  setEditFormErrors(errors);
  return Object.keys(errors).length === 0;
};

  const validateAchievementForm = (formValues: TargetAchievementFormValues): boolean => {
    const errors: TargetAchievementFormErrors = {};
    const values = [
      formValues.achieved_performance,
      formValues.achieved_opportunity,
      formValues.achieved_project_count,
    ];

    const hasInput = values.some(value => value.trim() !== '');
    if (!hasInput) {
      errors.achieved_performance = '请至少填写一个指标的达成情况';
    }

    (Object.keys(formValues) as Array<keyof TargetAchievementFormValues>).forEach(field => {
      const input = formValues[field].trim();
      if (input && parseNumber(input) === null) {
        errors[field] = '请输入有效的数值';
      }
    });

    setAchievementFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    setCreateFormData(createInitialCreateFormValues());
    setCreateFormErrors({});
    setShowCreateModal(true);
  };

  const openCreateModalForChannel = (channelId: string) => {
    setCreateFormData({
      ...createInitialCreateFormValues(),
      channel_id: channelId,
    });
    setCreateFormErrors({});
    setShowCreateModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowAchievementModal(false);
    setTargetForEdit(null);
    setTargetForAchievement(null);
    setCreateFormData(createInitialCreateFormValues());
    setEditFormData(createInitialEditFormValues());
    setAchievementFormData(createInitialAchievementFormValues());
    setCreateFormErrors({});
    setEditFormErrors({});
    setAchievementFormErrors({});
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCreateForm(createFormData)) {
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      const metrics: TargetMetricsInput = {
        month: createFormData.month ? Number(createFormData.month) : undefined,
        performance_target: Number(createFormData.performance_target),
        opportunity_target: Number(createFormData.opportunity_target),
        project_count_target: Number(createFormData.project_count_target),
        development_goal: createFormData.development_goal || undefined,
      };

      await targetService.createTarget(
        createFormData.channel_id,
        Number(createFormData.year),
        Number(createFormData.quarter),
        metrics
      );

      setShowCreateModal(false);
      setCreateFormData(createInitialCreateFormValues());

      await fetchTargets();
      setSuccessMessage('目标已成功创建');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '创建目标失败');
      setError(message);
      console.error('[Targets] Create failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetForEdit) {
      return;
    }

    if (!validateEditForm(editFormData)) {
      return;
    }

    setActionLoading('edit');
    setError(null);

    try {
      await targetService.updateTarget(targetForEdit.id, {
        year: Number(editFormData.year),
        quarter: Number(editFormData.quarter),
        month: editFormData.month ? Number(editFormData.month) : undefined,
        performance_target: Number(editFormData.performance_target),
        opportunity_target: Number(editFormData.opportunity_target),
        project_count_target: Number(editFormData.project_count_target),
        development_goal: editFormData.development_goal || undefined,
        achieved_performance: editFormData.achieved_performance
          ? Number(editFormData.achieved_performance)
          : undefined,
        achieved_opportunity: editFormData.achieved_opportunity
          ? Number(editFormData.achieved_opportunity)
          : undefined,
        achieved_project_count: editFormData.achieved_project_count
          ? Number(editFormData.achieved_project_count)
          : undefined,
      });

      setShowEditModal(false);
      setTargetForEdit(null);

      await fetchTargets();
      setSuccessMessage('目标已成功更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新目标失败');
      setError(message);
      console.error('[Targets] Update failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitAchievement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetForAchievement) {
      return;
    }

    if (!validateAchievementForm(achievementFormData)) {
      return;
    }

    setActionLoading('achievement');
    setError(null);

    try {
      await targetService.updateTargetAchievement(targetForAchievement.id, {
        achieved_performance: achievementFormData.achieved_performance
          ? Number(achievementFormData.achieved_performance)
          : undefined,
        achieved_opportunity: achievementFormData.achieved_opportunity
          ? Number(achievementFormData.achieved_opportunity)
          : undefined,
        achieved_project_count: achievementFormData.achieved_project_count
          ? Number(achievementFormData.achieved_project_count)
          : undefined,
      });

      setShowAchievementModal(false);
      setTargetForAchievement(null);

      await fetchTargets();
      setSuccessMessage('目标达成情况已更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新达成情况失败');
      setError(message);
      console.error('[Targets] Achievement update failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const renderTargetsForChannel = (channel: Channel, channelTargets: TargetPlan[]) => {
    return (
      <Card key={channel.id} className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title className="mb-0">{channel.name}</Card.Title>
            <small className="text-muted">业务类型：{businessTypeLabel(channel.business_type)}</small>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => openCreateModalForChannel(channel.id)}
          >
            为此渠道创建目标
          </Button>
        </Card.Header>
        <Card.Body>
          {channelTargets.length > 0 ? (
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>年度</th>
                  <th>季度</th>
                  <th>月度</th>
                  <th>业绩目标</th>
                  <th>商机目标</th>
                  <th>项目数量</th>
                  <th>达成情况</th>
                  <th>完成度</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {[...channelTargets]
                  .sort((a, b) => {
                    if (a.year !== b.year) {
                      return b.year - a.year;
                    }
                    if (a.quarter !== b.quarter) {
                      return b.quarter - a.quarter;
                    }
                    const monthA = typeof a.month === 'number' ? a.month : 0;
                    const monthB = typeof b.month === 'number' ? b.month : 0;
                    return monthB - monthA;
                  })
                  .map(target => (
                  <tr key={target.id}>
                    <td>{target.year}</td>
                    <td>
                      <Badge bg="secondary">Q{target.quarter}</Badge>
                    </td>
                    <td>{target.month ?? '-'}</td>
                    <td>{target.performance_target ?? '-'}</td>
                    <td>{target.opportunity_target ?? '-'}</td>
                    <td>{target.project_count_target ?? '-'}</td>
                    <td>
                      <div>业绩：{target.achieved_performance ?? '-'}</div>
                      <div>商机：{target.achieved_opportunity ?? '-'}</div>
                      <div>项目：{target.achieved_project_count ?? '-'}</div>
                    </td>
                    <td>{calculateCompletion(target)}</td>
                    <td>
                      <div className="d-flex flex-column gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            setTargetForEdit(target);
                            setShowEditModal(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setTargetForAchievement(target);
                            setShowAchievementModal(true);
                          }}
                        >
                          更新达成
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted mb-0">该渠道暂未设定目标</p>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title>目标规划</Card.Title>
              <Button variant="primary" className="float-end" onClick={handleOpenCreateModal}>
                创建目标
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

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" className="me-2" />
                  正在加载目标数据...
                </div>
              ) : channels.length === 0 ? (
                <p className="text-muted mb-0">暂无渠道数据，请先创建渠道。</p>
              ) : (
                channels.map(channel => {
                  const channelTargets = targets.filter(target => target.channel_id === channel.id);
                  return renderTargetsForChannel(channel, channelTargets);
                })
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>创建目标</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="createTargetForm" onSubmit={handleSubmitCreate}>
            <Form.Group className="mb-3" controlId="createTargetChannel">
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

            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="createTargetYear">
                  <Form.Label>年度</Form.Label>
                  <Form.Control
                    type="number"
                    value={createFormData.year}
                    onChange={event =>
                      setCreateFormData(prev => ({ ...prev, year: event.target.value }))
                    }
                    isInvalid={!!createFormErrors.year}
                    placeholder="例如：2025"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {createFormErrors.year}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="createTargetQuarter">
                  <Form.Label>季度</Form.Label>
                  <Form.Select
                    value={createFormData.quarter}
                    onChange={event =>
                      setCreateFormData(prev => ({ ...prev, quarter: event.target.value }))
                    }
                    isInvalid={!!createFormErrors.quarter}
                    required
                  >
                    <option value="">请选择季度</option>
                    <option value="1">第一季度</option>
                    <option value="2">第二季度</option>
                    <option value="3">第三季度</option>
                    <option value="4">第四季度</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {createFormErrors.quarter}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3 mt-3" controlId="createTargetMonth">
              <Form.Label>月度（可选）</Form.Label>
              <Form.Control
                type="number"
                value={createFormData.month}
                onChange={event =>
                  setCreateFormData(prev => ({ ...prev, month: event.target.value }))
                }
                isInvalid={!!createFormErrors.month}
                placeholder="1-12"
              />
              <Form.Control.Feedback type="invalid">
                {createFormErrors.month}
              </Form.Control.Feedback>
            </Form.Group>

            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="createTargetPerformance">
                  <Form.Label>业绩目标</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={createFormData.performance_target}
                    onChange={event =>
                      setCreateFormData(prev => ({ ...prev, performance_target: event.target.value }))
                    }
                    isInvalid={!!createFormErrors.performance_target}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {createFormErrors.performance_target}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="createTargetOpportunity">
                  <Form.Label>商机目标</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={createFormData.opportunity_target}
                    onChange={event =>
                      setCreateFormData(prev => ({ ...prev, opportunity_target: event.target.value }))
                    }
                    isInvalid={!!createFormErrors.opportunity_target}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {createFormErrors.opportunity_target}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="createTargetProjectCount">
                  <Form.Label>项目数量</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={createFormData.project_count_target}
                    onChange={event =>
                      setCreateFormData(prev => ({ ...prev, project_count_target: event.target.value }))
                    }
                    isInvalid={!!createFormErrors.project_count_target}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {createFormErrors.project_count_target}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3 mt-3" controlId="createTargetGoal">
              <Form.Label>发展目标（可选）</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={createFormData.development_goal}
                onChange={event =>
                  setCreateFormData(prev => ({ ...prev, development_goal: event.target.value }))
                }
                placeholder="请输入目标说明"
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
            form="createTargetForm"
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
          <Modal.Title>编辑目标</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {targetForEdit ? (
            <Form id="editTargetForm" onSubmit={handleSubmitEdit}>
              <Form.Group className="mb-3" controlId="editTargetChannel">
                <Form.Label>渠道</Form.Label>
                <Form.Control
                  type="text"
                  value={channelMap[targetForEdit.channel_id]?.name || targetForEdit.channel_id}
                  readOnly
                  plaintext
                />
              </Form.Group>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="editTargetYear">
                    <Form.Label>年度</Form.Label>
                    <Form.Control
                      type="number"
                      value={editFormData.year}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, year: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.year}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.year}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="editTargetQuarter">
                    <Form.Label>季度</Form.Label>
                    <Form.Select
                      value={editFormData.quarter}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, quarter: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.quarter}
                      required
                    >
                      <option value="1">第一季度</option>
                      <option value="2">第二季度</option>
                      <option value="3">第三季度</option>
                      <option value="4">第四季度</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.quarter}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3 mt-3" controlId="editTargetMonth">
                <Form.Label>月度（可选）</Form.Label>
                <Form.Control
                  type="number"
                  value={editFormData.month}
                  onChange={event =>
                    setEditFormData(prev => ({ ...prev, month: event.target.value }))
                  }
                  isInvalid={!!editFormErrors.month}
                  placeholder="1-12"
                />
                <Form.Control.Feedback type="invalid">
                  {editFormErrors.month}
                </Form.Control.Feedback>
              </Form.Group>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Group controlId="editTargetPerformance">
                    <Form.Label>业绩目标</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={editFormData.performance_target}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, performance_target: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.performance_target}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.performance_target}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editTargetOpportunity">
                    <Form.Label>商机目标</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={editFormData.opportunity_target}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, opportunity_target: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.opportunity_target}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.opportunity_target}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editTargetProjectCount">
                    <Form.Label>项目数量</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={editFormData.project_count_target}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, project_count_target: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.project_count_target}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.project_count_target}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3 mt-3" controlId="editTargetDevelopmentGoal">
                <Form.Label>发展目标（可选）</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editFormData.development_goal}
                  onChange={event =>
                    setEditFormData(prev => ({ ...prev, development_goal: event.target.value }))
                  }
                />
              </Form.Group>

              <hr />
              <h6>当前达成情况（可选）</h6>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group controlId="editTargetAchievedPerformance">
                    <Form.Label>已完成业绩</Form.Label>
                    <Form.Control
                      type="number"
                      value={editFormData.achieved_performance}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, achieved_performance: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.achieved_performance}
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.achieved_performance}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editTargetAchievedOpportunity">
                    <Form.Label>已完成商机</Form.Label>
                    <Form.Control
                      type="number"
                      value={editFormData.achieved_opportunity}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, achieved_opportunity: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.achieved_opportunity}
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.achieved_opportunity}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editTargetAchievedProjectCount">
                    <Form.Label>已完成项目</Form.Label>
                    <Form.Control
                      type="number"
                      value={editFormData.achieved_project_count}
                      onChange={event =>
                        setEditFormData(prev => ({ ...prev, achieved_project_count: event.target.value }))
                      }
                      isInvalid={!!editFormErrors.achieved_project_count}
                    />
                    <Form.Control.Feedback type="invalid">
                      {editFormErrors.achieved_project_count}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          ) : (
            <p>未选中任何目标。</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModals} disabled={actionLoading === 'edit'}>
            关闭
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="editTargetForm"
            disabled={!targetForEdit || actionLoading === 'edit'}
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

      <Modal show={showAchievementModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>更新达成情况</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {targetForAchievement ? (
            <Form id="achievementForm" onSubmit={handleSubmitAchievement}>
              <p>
                渠道：
                <strong className="ms-1">
                  {channelMap[targetForAchievement.channel_id]?.name || targetForAchievement.channel_id}
                </strong>
                ，季度：<strong className="ms-1">{targetForAchievement.year} 年 Q{targetForAchievement.quarter}</strong>
              </p>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group controlId="achievementPerformance">
                    <Form.Label>已完成业绩</Form.Label>
                    <Form.Control
                      type="number"
                      value={achievementFormData.achieved_performance}
                      onChange={event =>
                        setAchievementFormData(prev => ({ ...prev, achieved_performance: event.target.value }))
                      }
                      isInvalid={!!achievementFormErrors.achieved_performance}
                    />
                    <Form.Control.Feedback type="invalid">
                      {achievementFormErrors.achieved_performance}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="achievementOpportunity">
                    <Form.Label>已完成商机</Form.Label>
                    <Form.Control
                      type="number"
                      value={achievementFormData.achieved_opportunity}
                      onChange={event =>
                        setAchievementFormData(prev => ({ ...prev, achieved_opportunity: event.target.value }))
                      }
                      isInvalid={!!achievementFormErrors.achieved_opportunity}
                    />
                    <Form.Control.Feedback type="invalid">
                      {achievementFormErrors.achieved_opportunity}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="achievementProjectCount">
                    <Form.Label>已完成项目</Form.Label>
                    <Form.Control
                      type="number"
                      value={achievementFormData.achieved_project_count}
                      onChange={event =>
                        setAchievementFormData(prev => ({ ...prev, achieved_project_count: event.target.value }))
                      }
                      isInvalid={!!achievementFormErrors.achieved_project_count}
                    />
                    <Form.Control.Feedback type="invalid">
                      {achievementFormErrors.achieved_project_count}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          ) : (
            <p>未选中任何目标。</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseModals}
            disabled={actionLoading === 'achievement'}
          >
            关闭
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="achievementForm"
            disabled={!targetForAchievement || actionLoading === 'achievement'}
          >
            {actionLoading === 'achievement' ? (
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
    </Container>
  );
};

export default TargetsPage;
