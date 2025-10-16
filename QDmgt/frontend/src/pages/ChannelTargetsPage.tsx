import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, ButtonGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import authService, { User } from '../services/auth.service';
import channelService from '../services/channel.service';
import channelTargetService, { ChannelTarget, TargetData } from '../services/channel-target.service';
import { Channel } from '../types';

/**
 * 渠道目标管理页面
 *
 * 功能:
 * - 按人员、维度、年份、季度筛选目标
 * - 显示季度目标和月度目标的详细数据
 * - 支持新增、编辑、删除目标
 */

// 获取当前季度
const getCurrentQuarter = (): number => {
  const month = new Date().getMonth() + 1;
  return Math.ceil(month / 3);
};

// 根据季度获取月份
const getMonthsByQuarter = (quarter: number): number[] => {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
};

// 目标行数据 (用于UI显示)
interface TargetRow {
  id: string;
  name: string;
  type: 'person' | 'channel';
  target_id: string;  // 实际的user_id或channel_id
  quarterTarget: TargetData;
  monthTargets: {
    [month: number]: TargetData;
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
};

const ChannelTargetsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // 筛选条件
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [selectedDimension, setSelectedDimension] = useState<string>('personal');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(getCurrentQuarter());

  // 页面状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 用户数据
  const [users, setUsers] = useState<User[]>([]);

  // 渠道数据
  const [channels, setChannels] = useState<Channel[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEditTarget, setCurrentEditTarget] = useState<TargetRow | null>(null);
  const [currentDeleteId, setCurrentDeleteId] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Omit<TargetRow, 'id'>>({
    name: '',
    type: 'person',
    target_id: '',
    quarterTarget: {
      new_signing: 0,
      core_opportunity: 0,
      core_performance: 0,
      high_value_opportunity: 0,
      high_value_performance: 0,
    },
    monthTargets: {},
  });

  // 目标数据 (初始为空,从后端API加载)
  const [targets, setTargets] = useState<TargetRow[]>([]);

  const months = getMonthsByQuarter(selectedQuarter);
  const quarters = [1, 2, 3, 4];
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // 过滤掉默认的测试用户
  const defaultTestUsernames = ['admin', 'manager', 'user', 'testuser', 'mangeruser', 'superuser'];
  const filteredUsers = users.filter(u => {
    const usernameLower = u.username.toLowerCase();
    const fullNameLower = (u.full_name || '').toLowerCase();

    // 检查 username 或 full_name 是否匹配测试账户
    return !defaultTestUsernames.some(testUser =>
      usernameLower.includes(testUser) || fullNameLower.includes(testUser)
    );
  });

  // 维度暂时只保留个人
  const dimensions = [
    { value: 'personal', label: '个人' },
    // { value: 'team', label: '团队' },      // 暂时隐藏
    // { value: 'department', label: '部门' }, // 暂时隐藏
  ];

  const fetchUsers = useCallback(async () => {
    try {
      const userList = await authService.getUsers();
      setUsers(userList);
      console.log('[ChannelTargets] Users loaded', { count: userList.length });
    } catch (err) {
      console.error('[ChannelTargets] Failed to load users', err);
      // 用户加载失败不影响主流程,只记录错误
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await channelService.getChannels({ skip: 0, limit: 1000 });
      setChannels(response.channels);
      console.log('[ChannelTargets] Channels loaded', { count: response.channels.length });
    } catch (err) {
      console.error('[ChannelTargets] Failed to load channels', err);
      // 渠道加载失败不影响主流程,只记录错误
    }
  }, []);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 调用后端API获取目标列表
      const params = {
        year: selectedYear,
        quarter: selectedQuarter,
        skip: 0,
        limit: 1000,
      };

      // 如果选择了特定人员,添加筛选
      if (selectedPerson !== 'all') {
        Object.assign(params, {
          target_type: 'person' as const,
          target_id: selectedPerson,
        });
      }

      const response = await channelTargetService.getTargets(params);

      // 转换后端数据为前端显示格式
      const transformedTargets: TargetRow[] = response.targets.map((target: ChannelTarget) => {
        // 获取显示名称
        const displayName = getDisplayName(target.target_id, target.target_type as 'person' | 'channel');

        // 转换月度目标格式
        const monthTargets: { [month: number]: TargetData } = {};
        Object.keys(target.month_targets).forEach(monthStr => {
          const month = parseInt(monthStr);
          const data = target.month_targets[monthStr];
          monthTargets[month] = {
            new_signing: data.new_signing,
            core_opportunity: data.core_opportunity,
            core_performance: data.core_performance,
            high_value_opportunity: data.high_value_opportunity,
            high_value_performance: data.high_value_performance,
          };
        });

        return {
          id: target.id,
          name: displayName,
          type: target.target_type as 'person' | 'channel',
          target_id: target.target_id,
          quarterTarget: {
            new_signing: target.quarter_new_signing,
            core_opportunity: target.quarter_core_opportunity,
            core_performance: target.quarter_core_performance,
            high_value_opportunity: target.quarter_high_value_opportunity,
            high_value_performance: target.quarter_high_value_performance,
          },
          monthTargets,
        };
      });

      setTargets(transformedTargets);
      setSuccessMessage(null);
    } catch (err) {
      const message = getErrorMessage(err, '加载渠道目标失败');
      setError(message);
      console.error('[ChannelTargets] Fetch failed', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedQuarter, selectedPerson]);

  // 初始加载:只在组件挂载时执行一次
  useEffect(() => {
    // 并行加载用户和渠道数据
    Promise.all([
      fetchUsers(),
      fetchChannels(),
    ]).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 当用户和渠道数据加载完成后,或筛选条件变化时,加载目标数据
  useEffect(() => {
    if (users.length > 0 && channels.length > 0) {
      fetchTargets();
    }
  }, [selectedYear, selectedQuarter, selectedPerson, users.length, channels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 筛选已在后端完成,这里直接使用返回的数据
  const filteredTargets = targets;

  const handleAddTarget = () => {
    // 重置表单并显示新增对话框
    setFormData({
      name: '',
      type: 'person',
      target_id: '',
      quarterTarget: {
        new_signing: 0,
        core_opportunity: 0,
        core_performance: 0,
        high_value_opportunity: 0,
        high_value_performance: 0,
      },
      monthTargets: {},
    });
    setShowCreateModal(true);
  };

  const handleEdit = (id: string) => {
    const target = targets.find(t => t.id === id);
    if (target) {
      setCurrentEditTarget(target);
      setFormData({
        name: target.target_id,
        type: target.type,
        target_id: target.target_id,
        quarterTarget: { ...target.quarterTarget },
        monthTargets: { ...target.monthTargets },
      });
      setShowEditModal(true);
    }
  };

  const handleDelete = (id: string) => {
    setCurrentDeleteId(id);
    setShowDeleteModal(true);
  };

  // 根据ID获取显示名称
  const getDisplayName = (id: string, type: 'person' | 'channel'): string => {
    if (type === 'person') {
      const user = users.find(u => u.id === id);
      return user ? (user.full_name || user.username) : id;
    } else {
      const channel = channels.find(c => c.id === id);
      return channel ? channel.name : id;
    }
  };

  const handleCreateSubmit = async () => {
    try {
      if (!(formData.target_id || formData.name)) {
        setError('请选择人员或渠道');
        return;
      }

      setLoading(true);
      setError(null);

      // 转换为后端格式
      const monthTargetsForBackend: { [month: string]: any } = {};
      Object.keys(formData.monthTargets).forEach(monthStr => {
        const monthData = formData.monthTargets[parseInt(monthStr)];
        monthTargetsForBackend[monthStr] = {
          new_signing: monthData.new_signing,
          core_opportunity: monthData.core_opportunity,
          core_performance: monthData.core_performance,
          high_value_opportunity: monthData.high_value_opportunity,
          high_value_performance: monthData.high_value_performance,
        };
      });

      const createRequest = {
        target_type: formData.type,
        target_id: formData.target_id || formData.name, // 这里是用户ID或渠道ID
        year: selectedYear,
        quarter: selectedQuarter,
        quarter_target: {
          new_signing: formData.quarterTarget.new_signing,
          core_opportunity: formData.quarterTarget.core_opportunity,
          core_performance: formData.quarterTarget.core_performance,
          high_value_opportunity: formData.quarterTarget.high_value_opportunity,
          high_value_performance: formData.quarterTarget.high_value_performance,
        },
        month_targets: monthTargetsForBackend,
      };

      await channelTargetService.createTarget(createRequest);
      setSuccessMessage('目标创建成功');
      setShowCreateModal(false);

      // 刷新列表
      await fetchTargets();
    } catch (err) {
      const message = getErrorMessage(err, '创建目标失败');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!currentEditTarget) return;

    try {
      if (!(formData.target_id || formData.name)) {
        setError('请选择人员或渠道');
        return;
      }

      setLoading(true);
      setError(null);

      // 转换为后端格式
      const monthTargetsForBackend: { [month: string]: any } = {};
      Object.keys(formData.monthTargets).forEach(monthStr => {
        const monthData = formData.monthTargets[parseInt(monthStr)];
        monthTargetsForBackend[monthStr] = {
          new_signing: monthData.new_signing,
          core_opportunity: monthData.core_opportunity,
          core_performance: monthData.core_performance,
          high_value_opportunity: monthData.high_value_opportunity,
          high_value_performance: monthData.high_value_performance,
        };
      });

      const updateRequest = {
        quarter_target: {
          new_signing: formData.quarterTarget.new_signing,
          core_opportunity: formData.quarterTarget.core_opportunity,
          core_performance: formData.quarterTarget.core_performance,
          high_value_opportunity: formData.quarterTarget.high_value_opportunity,
          high_value_performance: formData.quarterTarget.high_value_performance,
        },
        month_targets: monthTargetsForBackend,
      };

      await channelTargetService.updateTarget(currentEditTarget.id, updateRequest);
      setSuccessMessage('目标更新成功');
      setShowEditModal(false);
      setCurrentEditTarget(null);

      // 刷新列表
      await fetchTargets();
    } catch (err) {
      const message = getErrorMessage(err, '更新目标失败');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentDeleteId) return;

    try {
      setLoading(true);
      setError(null);

      await channelTargetService.deleteTarget(currentDeleteId);
      setSuccessMessage('目标删除成功');
      setShowDeleteModal(false);
      setCurrentDeleteId(null);

      // 刷新列表
      await fetchTargets();
    } catch (err) {
      const message = getErrorMessage(err, '删除目标失败');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <Card.Title className="mb-0">渠道目标管理</Card.Title>
                </Col>
                <Col xs="auto">
                  <Button variant="primary" onClick={handleAddTarget}>
                    新增目标
                  </Button>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {/* 筛选条件区 */}
              <Row className="g-3 mb-4">
                <Col xs={12} md={6} lg={2}>
                  <Form.Group>
                    <Form.Label>人员</Form.Label>
                    <Form.Select
                      value={selectedPerson}
                      onChange={(e) => setSelectedPerson(e.target.value)}
                    >
                      <option value="all">全部人员</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={2}>
                  <Form.Group>
                    <Form.Label>维度</Form.Label>
                    <Form.Select
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                    >
                      {dimensions.map((dim) => (
                        <option key={dim.value} value={dim.value}>
                          {dim.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={2}>
                  <Form.Group>
                    <Form.Label>年份</Form.Label>
                    <Form.Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={6}>
                  <Form.Group>
                    <Form.Label>季度</Form.Label>
                    <div>
                      <ButtonGroup>
                        {quarters.map((q) => (
                          <Button
                            key={q}
                            variant={selectedQuarter === q ? 'primary' : 'outline-primary'}
                            onClick={() => setSelectedQuarter(q)}
                          >
                            Q{q}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              {/* 提示消息 */}
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

              {/* 表格区域 */}
              <div className="table-responsive">
                <Table bordered hover className="mb-0">
                  <thead className="table-light">
                    {/* 第一层表头 */}
                    <tr>
                      <th rowSpan={2} className="align-middle text-center" style={{ minWidth: '120px' }}>
                        销售 / 组织
                      </th>
                      <th colSpan={5} className="text-center bg-primary text-white">
                        Q{selectedQuarter} 目标
                      </th>
                      {months.map((month) => (
                        <th key={month} colSpan={5} className="text-center bg-info text-white">
                          {month} 月目标
                        </th>
                      ))}
                      <th rowSpan={2} className="align-middle text-center" style={{ minWidth: '100px' }}>
                        操作
                      </th>
                    </tr>

                    {/* 第二层表头 */}
                    <tr>
                      {/* Q目标子列 */}
                      <th className="text-center small" style={{ minWidth: '80px' }}>新签</th>
                      <th className="text-center small" style={{ minWidth: '90px' }}>核心商机</th>
                      <th className="text-center small" style={{ minWidth: '90px' }}>核心业绩</th>
                      <th className="text-center small" style={{ minWidth: '100px' }}>高价值商机</th>
                      <th className="text-center small" style={{ minWidth: '100px' }}>高价值业绩</th>

                      {/* 月度目标子列 */}
                      {months.map((month) => (
                        <React.Fragment key={month}>
                          <th className="text-center small" style={{ minWidth: '80px' }}>新签</th>
                          <th className="text-center small" style={{ minWidth: '90px' }}>核心商机</th>
                          <th className="text-center small" style={{ minWidth: '90px' }}>核心业绩</th>
                          <th className="text-center small" style={{ minWidth: '100px' }}>高价值商机</th>
                          <th className="text-center small" style={{ minWidth: '100px' }}>高价值业绩</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={18} className="text-center py-4">
                          <Spinner animation="border" role="status" size="sm" className="me-2" />
                          正在加载目标数据...
                        </td>
                      </tr>
                    ) : filteredTargets.length > 0 ? (
                      filteredTargets.map((target) => (
                        <tr key={target.id}>
                          <td className="fw-bold">{target.name}</td>

                          {/* Q目标数据 */}
                          <td className="text-end">{target.quarterTarget.new_signing}</td>
                          <td className="text-end">{target.quarterTarget.core_opportunity}</td>
                          <td className="text-end">{target.quarterTarget.core_performance}</td>
                          <td className="text-end">{target.quarterTarget.high_value_opportunity}</td>
                          <td className="text-end">{target.quarterTarget.high_value_performance}</td>

                          {/* 月度目标数据 */}
                          {months.map((month) => {
                            const monthTarget = target.monthTargets[month] || {
                              new_signing: 0,
                              core_opportunity: 0,
                              core_performance: 0,
                              high_value_opportunity: 0,
                              high_value_performance: 0,
                            };
                            return (
                              <React.Fragment key={month}>
                                <td className="text-end">{monthTarget.new_signing}</td>
                                <td className="text-end">{monthTarget.core_opportunity}</td>
                                <td className="text-end">{monthTarget.core_performance}</td>
                                <td className="text-end">{monthTarget.high_value_opportunity}</td>
                                <td className="text-end">{monthTarget.high_value_performance}</td>
                              </React.Fragment>
                            );
                          })}

                          {/* 操作列 */}
                          <td className="text-center">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="me-1"
                              onClick={() => handleEdit(target.id)}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(target.id)}
                            >
                              删除
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={18} className="text-center text-muted py-4">
                          暂无目标数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 新增目标模态框 */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>新增渠道目标</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>类型</Form.Label>
              <Form.Select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'person' | 'channel';
                  setFormData({ ...formData, type: newType, name: '', target_id: '' });
                }}
              >
                <option value="person">人员</option>
                <option value="channel">渠道</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{formData.type === 'person' ? '人员' : '渠道'}</Form.Label>
              <Form.Select
                value={formData.target_id || formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, target_id: e.target.value })}
                required
              >
                <option value="">请选择{formData.type === 'person' ? '人员' : '渠道'}</option>
                {formData.type === 'person' ? (
                  filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))
                ) : (
                  channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))
                )}
              </Form.Select>
            </Form.Group>

            <h6 className="mb-3">季度目标 (Q{selectedQuarter})</h6>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>新签</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.new_signing}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, new_signing: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>核心商机</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.core_opportunity}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, core_opportunity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>核心业绩</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.core_performance}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, core_performance: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>高价值商机</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.high_value_opportunity}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, high_value_opportunity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>高价值业绩</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.high_value_performance}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, high_value_performance: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreateSubmit}>
            创建
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 编辑目标模态框 */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>编辑渠道目标</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>类型</Form.Label>
              <Form.Select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'person' | 'channel';
                  setFormData({ ...formData, type: newType, name: '', target_id: '' });
                }}
              >
                <option value="person">人员</option>
                <option value="channel">渠道</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{formData.type === 'person' ? '人员' : '渠道'}</Form.Label>
              <Form.Select
                value={formData.target_id || formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, target_id: e.target.value })}
                required
              >
                <option value="">请选择{formData.type === 'person' ? '人员' : '渠道'}</option>
                {formData.type === 'person' ? (
                  filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))
                ) : (
                  channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))
                )}
              </Form.Select>
            </Form.Group>

            <h6 className="mb-3">季度目标 (Q{selectedQuarter})</h6>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>新签</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.new_signing}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, new_signing: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>核心商机</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.core_opportunity}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, core_opportunity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>核心业绩</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.core_performance}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, core_performance: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>高价值商机</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.high_value_opportunity}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, high_value_opportunity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>高价值业绩</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quarterTarget.high_value_performance}
                    onChange={(e) => setFormData({
                      ...formData,
                      quarterTarget: { ...formData.quarterTarget, high_value_performance: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleEditSubmit}>
            保存
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>确认删除</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          确定要删除这个目标吗?此操作无法撤销。
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            删除
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ChannelTargetsPage;
