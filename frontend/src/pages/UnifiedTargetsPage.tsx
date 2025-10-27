import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';
import unifiedTargetService, {
  CreateUnifiedTargetRequest,
  PeriodType,
  TargetCompletion,
  TargetQueryParams,
  TargetType,
  UnifiedTarget,
  UpdateUnifiedTargetAchievementRequest,
  UpdateUnifiedTargetRequest,
  QuarterViewResponse,
} from '../services/unified-target.service';
import authService, { User } from '../services/auth.service';
import channelService from '../services/channel.service';
import { Channel } from '../types';
import { usePermissions } from '../hooks/usePermissions';

const getCurrentQuarter = (): number => {
  const month = new Date().getMonth() + 1;
  return Math.ceil(month / 3);
};

const getMonthsByQuarter = (quarter: number): number[] => {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
};

const formatPercent = (value?: number): string => {
  if (value === undefined || Number.isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(2)}%`;
};

const buildCompletion = (target: UnifiedTarget): TargetCompletion => {
  const pairs: Array<[keyof TargetCompletion, number, number]> = [
    ['new_signing', target.new_signing_target, target.new_signing_achieved],
    ['core_opportunity', target.core_opportunity_target, target.core_opportunity_achieved],
    ['core_performance', target.core_performance_target, target.core_performance_achieved],
    ['high_value_opportunity', target.high_value_opportunity_target, target.high_value_opportunity_achieved],
    ['high_value_performance', target.high_value_performance_target, target.high_value_performance_achieved],
  ];

  let totalTarget = 0;
  let totalAchieved = 0;

  const completion: TargetCompletion = {
    new_signing: 0,
    core_opportunity: 0,
    core_performance: 0,
    high_value_opportunity: 0,
    high_value_performance: 0,
    overall: 0,
  };

  pairs.forEach(([key, targetValue, achievedValue]) => {
    if (targetValue && targetValue > 0) {
      const percentage = (achievedValue || 0) / targetValue * 100;
      completion[key] = Number(percentage.toFixed(2));
      totalTarget += targetValue;
      totalAchieved += achievedValue || 0;
    } else {
      completion[key] = 0;
    }
  });

  if (totalTarget > 0) {
    completion.overall = Number(((totalAchieved / totalTarget) * 100).toFixed(2));
  }

  return completion;
};

const defaultMetricState = {
  new_signing_target: 0,
  core_opportunity_target: 0,
  core_performance_target: 0,
  high_value_opportunity_target: 0,
  high_value_performance_target: 0,
};

const defaultAchievementState = {
  new_signing_achieved: 0,
  core_opportunity_achieved: 0,
  core_performance_achieved: 0,
  high_value_opportunity_achieved: 0,
  high_value_performance_achieved: 0,
};

const currentYear = new Date().getFullYear();

const years = [currentYear - 1, currentYear, currentYear + 1];
const quarters = [1, 2, 3, 4];

const UnifiedTargetsPage: React.FC = () => {
  const permissions = usePermissions();
  const [targetType, setTargetType] = useState<TargetType>('channel');
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(getCurrentQuarter());
  const [targets, setTargets] = useState<UnifiedTarget[]>([]);
  const [completionMap, setCompletionMap] = useState<Record<string, TargetCompletion>>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAchievementModal, setShowAchievementModal] = useState<boolean>(false);
  const [showQuarterModal, setShowQuarterModal] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<UnifiedTarget | null>(null);
  const [quarterView, setQuarterView] = useState<QuarterViewResponse | null>(null);
  const [quarterViewLoading, setQuarterViewLoading] = useState<boolean>(false);

  const [createFormData, setCreateFormData] = useState<CreateUnifiedTargetRequest>(
    () => ({
      target_type: targetType,
      target_id: '',
      period_type: periodType,
      year: currentYear,
      quarter: getCurrentQuarter(),
      month: periodType === 'month' ? getMonthsByQuarter(getCurrentQuarter())[0] : undefined,
      ...defaultMetricState,
      notes: '',
    })
  );

  const [editFormData, setEditFormData] = useState<UpdateUnifiedTargetRequest>({
    ...defaultMetricState,
    notes: '',
  });

  const [achievementFormData, setAchievementFormData] =
    useState<UpdateUnifiedTargetAchievementRequest>({
      ...defaultAchievementState,
    });

  const channelMap = useMemo(() => {
    const map: Record<string, Channel> = {};
    channels.forEach(channel => {
      map[channel.id] = channel;
    });
    return map;
  }, [channels]);

  const userMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const targetOptions = useMemo(() => {
    if (targetType === 'channel') {
      return channels.map(channel => ({
        value: channel.id,
        label: channel.name,
      }));
    }

    return users.map(user => ({
      value: user.id,
      label: user.full_name || user.username,
    }));
  }, [channels, users, targetType]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [channelResult, userList] = await Promise.all([
          channelService.getChannels({ skip: 0, limit: 1000 }),
          authService.getUsers(),
        ]);
        setChannels(channelResult.channels);
        setUsers(userList);
      } catch (err) {
        console.error('[UnifiedTargets] Failed to preload reference data', err);
        setError('基础数据加载失败，请刷新重试');
      }
    };

    loadInitialData();
  }, []);

  const resolveErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err === 'object' && err && 'message' in err) {
      const value = (err as { message?: string }).message;
      if (value) {
        return value;
      }
    }

    return fallback;
  };

  const getDisplayName = useCallback(
    (id: string, type: TargetType): string => {
      if (type === 'channel') {
        return channelMap[id]?.name || id;
      }
      const user = userMap[id];
      return user?.full_name || user?.username || id;
    },
    [channelMap, userMap]
  );

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: TargetQueryParams = {
      target_type: targetType,
      period_type: periodType,
      year: selectedYear,
      quarter: selectedQuarter,
      skip: 0,
      limit: 1000,
    };

    try {
      const list = await unifiedTargetService.getTargets(params);
      setTargets(list);

      const completionEntries = await Promise.all(
        list.map(async target => {
          try {
            const completion = await unifiedTargetService.getCompletion(target.id);
            return [target.id, completion] as const;
          } catch (completionError) {
            console.error('[UnifiedTargets] Completion fetch failed', completionError);
            return [target.id, buildCompletion(target)] as const;
          }
        })
      );

      const completionRecord: Record<string, TargetCompletion> = {};
      completionEntries.forEach(([id, completion]) => {
        completionRecord[id] = completion;
      });

      setCompletionMap(completionRecord);
    } catch (err) {
      const message = resolveErrorMessage(err, '目标列表加载失败，请稍后重试');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [targetType, periodType, selectedYear, selectedQuarter]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useEffect(() => {
    if (!showCreateModal) {
      setCreateFormData({
        target_type: targetType,
        target_id: targetOptions[0]?.value || '',
        period_type: periodType,
        year: selectedYear,
        quarter: selectedQuarter,
        month: periodType === 'month' ? getMonthsByQuarter(selectedQuarter)[0] : undefined,
        ...defaultMetricState,
        notes: '',
      });
    }
  }, [showCreateModal, targetType, periodType, selectedYear, selectedQuarter, targetOptions]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  const handleCreateChange = (
    field: keyof CreateUnifiedTargetRequest,
    value: string | number | undefined
  ) => {
    setCreateFormData(prev => {
      if (field === 'target_type') {
        const nextType = value as TargetType;
        const nextOptions = nextType === 'channel' ? channels : users;
        return {
          ...prev,
          target_type: nextType,
          target_id: nextOptions[0]?.id || '',
        };
      }

      if (field === 'period_type') {
        const nextPeriod = value as PeriodType;
        return {
          ...prev,
          period_type: nextPeriod,
          month: nextPeriod === 'month' ? getMonthsByQuarter(prev.quarter)[0] : undefined,
        };
      }

      if (field === 'quarter') {
        const nextQuarter = Number(value);
        return {
          ...prev,
          quarter: nextQuarter,
          month:
            prev.period_type === 'month'
              ? getMonthsByQuarter(nextQuarter)[0]
              : undefined,
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const openCreateModal = () => {
    setCreateFormData(prev => ({
      ...prev,
      target_type: targetType,
      target_id: targetOptions[0]?.value || '',
      period_type: periodType,
      year: selectedYear,
      quarter: selectedQuarter,
      month: periodType === 'month' ? getMonthsByQuarter(selectedQuarter)[0] : undefined,
    }));
    setShowCreateModal(true);
  };

  const openEditModal = (target: UnifiedTarget) => {
    setActiveTarget(target);
    setEditFormData({
      new_signing_target: target.new_signing_target,
      core_opportunity_target: target.core_opportunity_target,
      core_performance_target: target.core_performance_target,
      high_value_opportunity_target: target.high_value_opportunity_target,
      high_value_performance_target: target.high_value_performance_target,
      notes: target.notes || '',
    });
    setShowEditModal(true);
  };

  const openAchievementModal = (target: UnifiedTarget) => {
    setActiveTarget(target);
    setAchievementFormData({
      new_signing_achieved: target.new_signing_achieved,
      core_opportunity_achieved: target.core_opportunity_achieved,
      core_performance_achieved: target.core_performance_achieved,
      high_value_opportunity_achieved: target.high_value_opportunity_achieved,
      high_value_performance_achieved: target.high_value_performance_achieved,
    });
    setShowAchievementModal(true);
  };

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowAchievementModal(false);
    setShowQuarterModal(false);
    setActiveTarget(null);
    setQuarterView(null);
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createFormData.target_id) {
      setError('请选择目标对象');
      return;
    }

    if (createFormData.period_type === 'month' && !createFormData.month) {
      setError('请选择月份');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await unifiedTargetService.createTarget({
        ...createFormData,
        month:
          createFormData.period_type === 'month'
            ? createFormData.month
            : undefined,
      });
      setSuccessMessage('目标创建成功');
      setShowCreateModal(false);
      await fetchTargets();
    } catch (err) {
      const message = resolveErrorMessage(err, '目标创建失败，请稍后重试');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeTarget) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: UpdateUnifiedTargetRequest = {
        ...editFormData,
        notes: editFormData.notes && editFormData.notes.trim().length > 0
          ? editFormData.notes
          : undefined,
      };
      await unifiedTargetService.updateTarget(activeTarget.id, payload);
      setSuccessMessage('目标更新成功');
      setShowEditModal(false);
      await fetchTargets();
    } catch (err) {
      const message = resolveErrorMessage(err, '目标更新失败，请稍后重试');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAchievementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeTarget) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await unifiedTargetService.updateAchievement(activeTarget.id, {
        ...achievementFormData,
      });
      setSuccessMessage('达成数据更新成功');
      setShowAchievementModal(false);
      await fetchTargets();
    } catch (err) {
      const message = resolveErrorMessage(err, '更新达成数据失败，请稍后重试');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTarget = async (target: UnifiedTarget) => {
    if (!permissions.canDelete) {
      return;
    }

    const confirmed = window.confirm('确定要删除该目标吗？该操作不可恢复。');
    if (!confirmed) {
      return;
    }

    try {
      await unifiedTargetService.deleteTarget(target.id);
      setSuccessMessage('目标已删除');
      await fetchTargets();
    } catch (err) {
      const message = resolveErrorMessage(err, '删除目标失败，请稍后重试');
      setError(message);
    }
  };

  const handleViewQuarter = async (target: UnifiedTarget) => {
    setActiveTarget(target);
    setShowQuarterModal(true);
    setQuarterView(null);
    setQuarterViewLoading(true);

    try {
      const data = await unifiedTargetService.getQuarterView(
        target.target_type,
        target.target_id,
        target.year,
        target.quarter
      );
      setQuarterView(data);
    } catch (err) {
      const message = resolveErrorMessage(err, '季度视图加载失败，请稍后重试');
      setError(message);
    } finally {
      setQuarterViewLoading(false);
    }
  };

  const renderMetricCell = (
    target: UnifiedTarget,
    completion: TargetCompletion | undefined,
    metric: {
      key: keyof TargetCompletion;
      targetField: keyof UnifiedTarget;
      achievedField: keyof UnifiedTarget;
      label: string;
    }
  ) => {
    const targetValue = target[metric.targetField] as number;
    const achievedValue = target[metric.achievedField] as number;
    const completionValue = completion ? completion[metric.key] : buildCompletion(target)[metric.key];

    return (
      <>
        <td className="text-end">{targetValue}</td>
        <td className="text-end">{achievedValue}</td>
        <td className="text-end">{formatPercent(completionValue)}</td>
      </>
    );
  };

  const metricDefinitions = useMemo(
    () => [
      {
        key: 'new_signing' as keyof TargetCompletion,
        targetField: 'new_signing_target' as keyof UnifiedTarget,
        achievedField: 'new_signing_achieved' as keyof UnifiedTarget,
        label: '新签约',
      },
      {
        key: 'core_opportunity' as keyof TargetCompletion,
        targetField: 'core_opportunity_target' as keyof UnifiedTarget,
        achievedField: 'core_opportunity_achieved' as keyof UnifiedTarget,
        label: '核心商机',
      },
      {
        key: 'core_performance' as keyof TargetCompletion,
        targetField: 'core_performance_target' as keyof UnifiedTarget,
        achievedField: 'core_performance_achieved' as keyof UnifiedTarget,
        label: '核心业绩',
      },
      {
        key: 'high_value_opportunity' as keyof TargetCompletion,
        targetField: 'high_value_opportunity_target' as keyof UnifiedTarget,
        achievedField: 'high_value_opportunity_achieved' as keyof UnifiedTarget,
        label: '高价值商机',
      },
      {
        key: 'high_value_performance' as keyof TargetCompletion,
        targetField: 'high_value_performance_target' as keyof UnifiedTarget,
        achievedField: 'high_value_performance_achieved' as keyof UnifiedTarget,
        label: '高价值业绩',
      },
    ],
    []
  );

  return (
    <Container fluid>
      <Row className="mb-3">
        <Col>
          <h2 className="fw-bold">统一目标管理</h2>
          <p className="text-muted">
            管理渠道与人员的季度/月度目标，实时查看目标完成情况并快速更新。
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="gy-3 gy-md-0 align-items-center">
                <Col md={4}>
                  <Tabs
                    id="target-type-tabs"
                    activeKey={targetType}
                    onSelect={key => setTargetType((key as TargetType) || 'channel')}
                    className="mb-3 mb-md-0"
                  >
                    <Tab eventKey="channel" title="渠道目标" />
                    <Tab eventKey="person" title="人员目标" />
                  </Tabs>
                </Col>
                <Col md={4}>
                  <Tabs
                    id="period-type-tabs"
                    activeKey={periodType}
                    onSelect={key => setPeriodType((key as PeriodType) || 'quarter')}
                    className="mb-3 mb-md-0"
                  >
                    <Tab eventKey="quarter" title="季度视图" />
                    <Tab eventKey="month" title="月度视图" />
                  </Tabs>
                </Col>
                <Col md={4} className="text-md-end">
                  {permissions.canCreate && (
                    <Button variant="primary" onClick={openCreateModal}>
                      新建目标
                    </Button>
                  )}
                </Col>
              </Row>

              <Row className="mt-3 g-3">
                <Col xs={6} md={2}>
                  <Form.Label className="small text-secondary">年份</Form.Label>
                  <Form.Select
                    value={selectedYear}
                    onChange={event => setSelectedYear(Number(event.target.value))}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xs={6} md={2}>
                  <Form.Label className="small text-secondary">季度</Form.Label>
                  <Form.Select
                    value={selectedQuarter}
                    onChange={event => setSelectedQuarter(Number(event.target.value))}
                  >
                    {quarters.map(quarter => (
                      <option key={quarter} value={quarter}>
                        第{quarter}季度
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body className="p-0">
              {loading ? (
                <div className="py-5 text-center">
                  <Spinner animation="border" role="status" />
                  <p className="mt-3 mb-0 text-muted">正在加载目标数据...</p>
                </div>
              ) : targets.length === 0 ? (
                <div className="py-5 text-center text-muted">
                  暂无目标数据，请调整筛选条件或新建目标。
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover responsive className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th rowSpan={2}>目标对象</th>
                        <th rowSpan={2}>周期</th>
                        <th rowSpan={2}>备注</th>
                        {metricDefinitions.map(metric => (
                          <th key={metric.key} colSpan={3} className="text-center">
                            {metric.label}
                          </th>
                        ))}
                        <th rowSpan={2}>总体完成度</th>
                        <th rowSpan={2} className="text-center">
                          操作
                        </th>
                      </tr>
                      <tr>
                        {metricDefinitions.map(metric => (
                          <React.Fragment key={`${metric.key}-labels`}>
                            <th className="text-center">目标</th>
                            <th className="text-center">达成</th>
                            <th className="text-center">完成度</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {targets.map(target => {
                        const completion = completionMap[target.id];
                        return (
                          <tr key={target.id}>
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-semibold">{getDisplayName(target.target_id, target.target_type)}</span>
                                <span className="text-muted small">
                                  {target.target_type === 'channel' ? '渠道' : '人员'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column">
                                <span>
                                  {target.year}年 第{target.quarter}季度
                                </span>
                                {target.period_type === 'month' && target.month && (
                                  <Badge bg="info" className="mt-1 align-self-start">
                                    {target.month} 月
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="text-muted">
                              {target.notes && target.notes.trim().length > 0 ? target.notes : '—'}
                            </td>
                            {metricDefinitions.map(metric => (
                              <React.Fragment key={`${target.id}-${metric.key}`}>
                                {renderMetricCell(target, completion, metric)}
                              </React.Fragment>
                            ))}
                            <td className="text-end fw-semibold">
                              {formatPercent(completion ? completion.overall : buildCompletion(target).overall)}
                            </td>
                            <td className="text-center">
                              <div className="d-flex flex-wrap gap-2 justify-content-center">
                                {permissions.canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => openEditModal(target)}
                                  >
                                    编辑目标
                                  </Button>
                                )}
                                {permissions.canUpdateAchievement && (
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() => openAchievementModal(target)}
                                  >
                                    更新达成
                                  </Button>
                                )}
                                {target.period_type === 'quarter' && (
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => handleViewQuarter(target)}
                                  >
                                    季度详情
                                  </Button>
                                )}
                                {permissions.canDelete && (
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDeleteTarget(target)}
                                  >
                                    删除
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={closeAllModals} size="lg" centered>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>新建目标</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>目标类型</Form.Label>
                <Form.Select
                  value={createFormData.target_type}
                  onChange={event =>
                    handleCreateChange('target_type', event.target.value as TargetType)
                  }
                  disabled={targetOptions.length === 0}
                >
                  <option value="channel">渠道目标</option>
                  <option value="person">人员目标</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>目标对象</Form.Label>
                <Form.Select
                  value={createFormData.target_id}
                  onChange={event => handleCreateChange('target_id', event.target.value)}
                  required
                >
                  <option value="" disabled>
                    请选择目标对象
                  </option>
                  {createFormData.target_type === 'channel'
                    ? channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))
                    : users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username}
                        </option>
                      ))}
                </Form.Select>
              </Col>
            </Row>

            <Row className="g-3 mt-0 mt-md-2">
              <Col md={4}>
                <Form.Label>周期类型</Form.Label>
                <Form.Select
                  value={createFormData.period_type}
                  onChange={event =>
                    handleCreateChange('period_type', event.target.value as PeriodType)
                  }
                >
                  <option value="quarter">季度</option>
                  <option value="month">月度</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>年份</Form.Label>
                <Form.Select
                  value={createFormData.year}
                  onChange={event =>
                    handleCreateChange('year', Number(event.target.value))
                  }
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>季度</Form.Label>
                <Form.Select
                  value={createFormData.quarter}
                  onChange={event =>
                    handleCreateChange('quarter', Number(event.target.value))
                  }
                >
                  {quarters.map(quarter => (
                    <option key={quarter} value={quarter}>
                      第{quarter}季度
                    </option>
                  ))}
                </Form.Select>
              </Col>
              {createFormData.period_type === 'month' && (
                <Col md={4}>
                  <Form.Label>月份</Form.Label>
                  <Form.Select
                    value={createFormData.month}
                    onChange={event =>
                      handleCreateChange('month', Number(event.target.value))
                    }
                    required
                  >
                    {getMonthsByQuarter(createFormData.quarter).map(month => (
                      <option key={month} value={month}>
                        {month}月
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}
            </Row>

            <hr className="my-4" />

            <Row className="g-3">
              <Col md={6}>
                <Form.Label>新签约目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createFormData.new_signing_target}
                  onChange={event =>
                    handleCreateChange('new_signing_target', Number(event.target.value))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心商机目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createFormData.core_opportunity_target}
                  onChange={event =>
                    handleCreateChange('core_opportunity_target', Number(event.target.value))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心业绩目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createFormData.core_performance_target}
                  onChange={event =>
                    handleCreateChange('core_performance_target', Number(event.target.value))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值商机目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createFormData.high_value_opportunity_target}
                  onChange={event =>
                    handleCreateChange('high_value_opportunity_target', Number(event.target.value))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值业绩目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createFormData.high_value_performance_target}
                  onChange={event =>
                    handleCreateChange('high_value_performance_target', Number(event.target.value))
                  }
                  required
                />
              </Col>
              <Col md={12}>
                <Form.Label>备注</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={createFormData.notes || ''}
                  onChange={event => handleCreateChange('notes', event.target.value)}
                  placeholder="例如：重点关注核心商机质量"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '提交中...' : '确认创建'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditModal} onHide={closeAllModals} size="lg" centered>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>编辑目标</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {activeTarget && (
              <div className="mb-3">
                <div className="fw-semibold">
                  {getDisplayName(activeTarget.target_id, activeTarget.target_type)}
                </div>
                <div className="text-muted small">
                  {activeTarget.year}年 第{activeTarget.quarter}季度
                  {activeTarget.period_type === 'month' && activeTarget.month
                    ? ` · ${activeTarget.month}月`
                    : ''}
                </div>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Label>新签约目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editFormData.new_signing_target ?? 0}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      new_signing_target: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心商机目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editFormData.core_opportunity_target ?? 0}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      core_opportunity_target: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心业绩目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editFormData.core_performance_target ?? 0}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      core_performance_target: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值商机目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editFormData.high_value_opportunity_target ?? 0}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      high_value_opportunity_target: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值业绩目标</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={editFormData.high_value_performance_target ?? 0}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      high_value_performance_target: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={12}>
                <Form.Label>备注</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editFormData.notes || ''}
                  onChange={event =>
                    setEditFormData(prev => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="可选：补充修改说明"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '保存中...' : '保存修改'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showAchievementModal} onHide={closeAllModals} size="lg" centered>
        <Form onSubmit={handleAchievementSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>更新达成数据</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {activeTarget && (
              <div className="mb-3">
                <div className="fw-semibold">
                  {getDisplayName(activeTarget.target_id, activeTarget.target_type)}
                </div>
                <div className="text-muted small">
                  {activeTarget.year}年 第{activeTarget.quarter}季度
                  {activeTarget.period_type === 'month' && activeTarget.month
                    ? ` · ${activeTarget.month}月`
                    : ''}
                </div>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Label>新签约达成</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={achievementFormData.new_signing_achieved ?? 0}
                  onChange={event =>
                    setAchievementFormData(prev => ({
                      ...prev,
                      new_signing_achieved: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心商机达成</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={achievementFormData.core_opportunity_achieved ?? 0}
                  onChange={event =>
                    setAchievementFormData(prev => ({
                      ...prev,
                      core_opportunity_achieved: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>核心业绩达成</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={achievementFormData.core_performance_achieved ?? 0}
                  onChange={event =>
                    setAchievementFormData(prev => ({
                      ...prev,
                      core_performance_achieved: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值商机达成</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={achievementFormData.high_value_opportunity_achieved ?? 0}
                  onChange={event =>
                    setAchievementFormData(prev => ({
                      ...prev,
                      high_value_opportunity_achieved: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>高价值业绩达成</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={achievementFormData.high_value_performance_achieved ?? 0}
                  onChange={event =>
                    setAchievementFormData(prev => ({
                      ...prev,
                      high_value_performance_achieved: Number(event.target.value),
                    }))
                  }
                  required
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '保存中...' : '保存达成数据'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showQuarterModal} onHide={closeAllModals} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>季度视图详情</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeTarget && (
            <div className="mb-3">
              <div className="fw-semibold">
                {getDisplayName(activeTarget.target_id, activeTarget.target_type)}
              </div>
              <div className="text-muted small">
                {activeTarget.year}年 第{activeTarget.quarter}季度
              </div>
            </div>
          )}

          {quarterViewLoading ? (
            <div className="py-4 text-center">
              <Spinner animation="border" />
              <p className="mt-3 mb-0 text-muted">正在加载季度详情...</p>
            </div>
          ) : quarterView ? (
            <>
              {quarterView.quarter ? (
                <div className="mb-4">
                  <h6 className="fw-semibold">季度目标</h6>
                  <div className="table-responsive">
                    <Table bordered size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>指标</th>
                          <th className="text-end">目标</th>
                          <th className="text-end">达成</th>
                          <th className="text-end">完成度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricDefinitions.map(metric => {
                          const completion = completionMap[quarterView.quarter!.id] || buildCompletion(quarterView.quarter!);
                          return (
                            <tr key={`quarter-${metric.key}`}>
                              <td>{metric.label}</td>
                              <td className="text-end">
                                {quarterView.quarter?.[metric.targetField] as number}
                              </td>
                              <td className="text-end">
                                {quarterView.quarter?.[metric.achievedField] as number}
                              </td>
                              <td className="text-end">{formatPercent(completion[metric.key])}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td>总体完成度</td>
                          <td className="text-end" colSpan={2}>
                            —
                          </td>
                          <td className="text-end fw-semibold">
                            {formatPercent(
                              (completionMap[quarterView.quarter.id] || buildCompletion(quarterView.quarter)).overall
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </div>
              ) : (
                <Alert variant="warning">暂无季度目标数据。</Alert>
              )}

              <h6 className="fw-semibold">月度拆分</h6>
              {quarterView.months.length === 0 ? (
                <Alert variant="secondary" className="mb-0">
                  暂无月度目标数据。
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table bordered size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>月份</th>
                        <th className="text-end">新签约目标</th>
                        <th className="text-end">新签约达成</th>
                        <th className="text-end">核心商机目标</th>
                        <th className="text-end">核心商机达成</th>
                        <th className="text-end">核心业绩目标</th>
                        <th className="text-end">核心业绩达成</th>
                        <th className="text-end">高价值商机目标</th>
                        <th className="text-end">高价值商机达成</th>
                        <th className="text-end">高价值业绩目标</th>
                        <th className="text-end">高价值业绩达成</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterView.months.map(monthTarget => (
                        <tr key={monthTarget.id}>
                          <td>{monthTarget.month}月</td>
                          <td className="text-end">{monthTarget.new_signing_target}</td>
                          <td className="text-end">{monthTarget.new_signing_achieved}</td>
                          <td className="text-end">{monthTarget.core_opportunity_target}</td>
                          <td className="text-end">{monthTarget.core_opportunity_achieved}</td>
                          <td className="text-end">{monthTarget.core_performance_target}</td>
                          <td className="text-end">{monthTarget.core_performance_achieved}</td>
                          <td className="text-end">{monthTarget.high_value_opportunity_target}</td>
                          <td className="text-end">{monthTarget.high_value_opportunity_achieved}</td>
                          <td className="text-end">{monthTarget.high_value_performance_target}</td>
                          <td className="text-end">{monthTarget.high_value_performance_achieved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <Alert variant="secondary" className="mb-0">
              暂无季度数据可展示。
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAllModals}>
            关闭
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UnifiedTargetsPage;
