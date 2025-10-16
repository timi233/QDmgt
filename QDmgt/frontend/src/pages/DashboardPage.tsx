import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Form, Table, Badge, Button } from 'react-bootstrap';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { channelService } from '../services/channel.service';
import { executionService } from '../services/execution.service';
import { assignmentService, type Assignment } from '../services/assignment.service';
import { authService } from '../services/auth.service';
import type { Channel, User as AppUser } from '../types';

interface DashboardMetrics {
  totalChannels: number;
  activeChannels: number;
  inactiveChannels: number;
  suspendedChannels: number;
  assignedChannels: number;
  totalPlans: number;
  inProgressPlans: number;
  assignedInProgressPlans: number;
  byBusinessType: {
    basic: number;
    high_value: number;
    pending_signup: number;
  };
  plannedPlans: number;
  completedPlans: number;
  archivedPlans: number;
}

interface DashboardStat {
  title: string;
  value: string;
  description: string;
}

type ChannelWithResponsible = Channel & { responsible_user: string };

const initialMetrics: DashboardMetrics = {
  totalChannels: 0,
  activeChannels: 0,
  inactiveChannels: 0,
  suspendedChannels: 0,
  assignedChannels: 0,
  totalPlans: 0,
  inProgressPlans: 0,
  assignedInProgressPlans: 0,
  byBusinessType: {
    basic: 0,
    high_value: 0,
    pending_signup: 0,
  },
  plannedPlans: 0,
  completedPlans: 0,
  archivedPlans: 0,
};

const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelAssignments, setChannelAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [channelSearchTerm, setChannelSearchTerm] = useState<string>('');
  const [channelPage, setChannelPage] = useState<number>(1);
  const channelsPerPage = 10;

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const usersPromise: Promise<AppUser[]> = isAdminUser
          ? authService.getUsers().catch(err => {
              console.error('[Dashboard] Failed to fetch users', err);
              return [] as AppUser[];
            })
          : Promise.resolve<AppUser[]>([]);

        const [channelResponse, assignmentsResult, usersResult] = await Promise.all([
          channelService.getChannels({ limit: 1000 }),
          user ? assignmentService.getAssignmentsByUser(user.id) : Promise.resolve<Assignment[]>([]),
          usersPromise,
        ]);

        const channelsData = channelResponse.channels ?? [];
        const userAssignmentsData = assignmentsResult ?? [];
        const usersData = usersResult ?? [];

        const executionPlanPromises = channelsData.map(channel => executionService.getExecutionPlansByChannel(channel.id));
        const executionPlanGroups = await Promise.all(executionPlanPromises);
        const executionPlans = executionPlanGroups.flat();

        let assignmentsForListing: Assignment[] = userAssignmentsData;

        if (isAdminUser) {
          const assignmentPromises = channelsData.map(channel =>
            assignmentService
              .getAssignmentsByChannel(channel.id)
              .catch(err => {
                console.error('[Dashboard] Failed to fetch assignments for channel', channel.id, err);
                return [] as Assignment[];
              })
          );
          const assignmentGroups = await Promise.all(assignmentPromises);
          assignmentsForListing = assignmentGroups.flat();
        }

        if (!isMounted) {
          return;
        }

        setChannels(channelsData);
        setUsers(usersData);
        setChannelAssignments(assignmentsForListing);

        const activeChannels = channelsData.filter(channelItem => channelItem.status === 'active').length;
        const inactiveChannels = channelsData.filter(channelItem => channelItem.status === 'inactive').length;
        const suspendedChannels = channelsData.filter(channelItem => channelItem.status === 'suspended').length;

        const totalPlans = executionPlans.length;
        const inProgressPlans = executionPlans.filter(plan => plan.execution_status === 'in-progress').length;
        const plannedPlans = executionPlans.filter(plan => plan.execution_status === 'planned').length;
        const completedPlans = executionPlans.filter(plan => plan.execution_status === 'completed').length;
        const archivedPlans = executionPlans.filter(plan => plan.execution_status === 'archived').length;

        const assignedChannelIds = new Set(userAssignmentsData.map(assignment => assignment.channel_id));
        const assignedInProgressPlans = isAdminUser
          ? inProgressPlans
          : executionPlans.filter(
              plan => plan.execution_status === 'in-progress' && assignedChannelIds.has(plan.channel_id)
            ).length;

        const basicChannels = channelsData.filter(channelItem => channelItem.business_type === 'basic').length;
        const highValueChannels = channelsData.filter(channelItem => {
          const businessType = channelItem.business_type as string;
          return businessType === 'high-value' || businessType === 'high_value';
        }).length;
        const pendingSignupChannels = channelsData.filter(channelItem => {
          const businessType = channelItem.business_type as string;
          return businessType === 'pending-signup' || businessType === 'pending_signup';
        }).length;

        setMetrics({
          totalChannels: channelsData.length,
          activeChannels,
          inactiveChannels,
          suspendedChannels,
          assignedChannels: userAssignmentsData.length,
          totalPlans,
          inProgressPlans,
          assignedInProgressPlans,
          byBusinessType: {
            basic: basicChannels,
            high_value: highValueChannels,
            pending_signup: pendingSignupChannels,
          },
          plannedPlans,
          completedPlans,
          archivedPlans,
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message = err instanceof Error ? err.message : '数据加载失败，请稍后重试。';
        setError(message);
        setMetrics({ ...initialMetrics });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [isAdminUser, user]);

  const stats: DashboardStat[] = useMemo(() => {
    const activeRate = metrics.totalChannels ? Math.round((metrics.activeChannels / metrics.totalChannels) * 100) : 0;
    const responsibleChannelsCount = isAdminUser ? metrics.totalChannels : metrics.assignedChannels;
    const responsibleInProgressPlans = isAdminUser ? metrics.inProgressPlans : metrics.assignedInProgressPlans;

    return [
      {
        title: '渠道总数',
        value: metrics.totalChannels.toString(),
        description: `活跃 ${metrics.activeChannels} · 停用 ${metrics.inactiveChannels} · 暂停 ${metrics.suspendedChannels}`,
      },
      {
        title: '活跃渠道',
        value: metrics.activeChannels.toString(),
        description: `占比 ${activeRate}%`,
      },
      {
        title: '我负责的渠道',
        value: responsibleChannelsCount.toString(),
        description: `执行中 ${responsibleInProgressPlans}`,
      },
      {
        title: '执行计划数',
        value: metrics.totalPlans.toString(),
        description: `进行中 ${metrics.inProgressPlans}`,
      },
    ];
  }, [isAdminUser, metrics]);

  const channelStatusData = useMemo(
    () =>
      [
        { name: '活跃', value: metrics.activeChannels, fill: '#10b981' },
        { name: '停用', value: metrics.inactiveChannels, fill: '#6b7280' },
        { name: '暂停', value: metrics.suspendedChannels, fill: '#f59e0b' },
      ].filter(item => item.value > 0),
    [metrics]
  );

  const businessTypeData = useMemo(
    () =>
      [
        { name: '基本盘', value: metrics.byBusinessType.basic, fill: '#3b82f6' },
        { name: '高价值', value: metrics.byBusinessType.high_value, fill: '#8b5cf6' },
        { name: '待签约', value: metrics.byBusinessType.pending_signup, fill: '#ec4899' },
      ].filter(item => item.value > 0),
    [metrics]
  );

  const planStatusData = useMemo(
    () => [
      { name: '计划中', value: metrics.plannedPlans, fill: '#94a3b8' },
      { name: '执行中', value: metrics.inProgressPlans, fill: '#f59e0b' },
      { name: '已完成', value: metrics.completedPlans, fill: '#10b981' },
      { name: '已归档', value: metrics.archivedPlans, fill: '#6b7280' },
    ],
    [metrics]
  );

  const userMap = useMemo(() => {
    return users.reduce<Record<string, AppUser>>((acc, currentUser) => {
      acc[currentUser.id] = currentUser;
      return acc;
    }, {});
  }, [users]);

  const channelAssignmentsMap = useMemo(() => {
    return channelAssignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      if (!acc[assignment.channel_id]) {
        acc[assignment.channel_id] = [];
      }
      acc[assignment.channel_id].push(assignment);
      return acc;
    }, {});
  }, [channelAssignments]);

  const channelListData: ChannelWithResponsible[] = useMemo(() => {
    // 管理员看全部渠道，普通用户只看分配给自己的渠道
    let channelsToShow: Channel[] = channels;

    if (!isAdminUser && user) {
      // 普通用户：筛选出分配给自己的渠道
      const myChannelIds = new Set(
        channelAssignments
          .filter(assignment => assignment.user_id === user.id)
          .map(assignment => assignment.channel_id)
      );
      channelsToShow = channels.filter(channel => myChannelIds.has(channel.id));
    }

    return channelsToShow.map<ChannelWithResponsible>(channel => {
      const assignmentsForChannel = channelAssignmentsMap[channel.id] || [];
      const responsibleAssignment = assignmentsForChannel.find(assignment => assignment.target_responsibility);
      const fallbackAssignment = assignmentsForChannel[0];
      const responsibleUserId = responsibleAssignment?.user_id ?? fallbackAssignment?.user_id;
      const responsibleUser = responsibleUserId ? userMap[responsibleUserId] : undefined;
      const responsibleName = responsibleUser?.full_name || responsibleUser?.username || '-';

      return {
        ...channel,
        responsible_user: responsibleName,
      };
    });
  }, [channels, channelAssignments, channelAssignmentsMap, userMap, isAdminUser, user]);

  const filteredChannels = useMemo(() => {
    const searchTerm = channelSearchTerm.trim().toLowerCase();
    if (!searchTerm) {
      return channelListData;
    }

    return channelListData.filter(channel => {
      const nameMatch = channel.name.toLowerCase().includes(searchTerm);
      const responsibleMatch = channel.responsible_user.toLowerCase().includes(searchTerm);
      return nameMatch || responsibleMatch;
    });
  }, [channelListData, channelSearchTerm]);

  const totalPages = useMemo(() => {
    if (!filteredChannels.length) {
      return 0;
    }
    return Math.ceil(filteredChannels.length / channelsPerPage);
  }, [filteredChannels.length, channelsPerPage]);

  const paginatedChannels = useMemo(() => {
    const start = (channelPage - 1) * channelsPerPage;
    return filteredChannels.slice(start, start + channelsPerPage);
  }, [filteredChannels, channelPage, channelsPerPage]);

  useEffect(() => {
    if (totalPages === 0) {
      if (channelPage !== 1) {
        setChannelPage(1);
      }
      return;
    }

    if (channelPage > totalPages) {
      setChannelPage(totalPages);
    }
  }, [channelPage, totalPages]);

  const getStatusVariant = (status: string): string => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'inactive':
        return '停用';
      case 'suspended':
        return '暂停';
      default:
        return status;
    }
  };

  const getBusinessTypeLabel = (type: string): string => {
    switch (type) {
      case 'basic':
        return '基本盘';
      case 'high-value':
      case 'high_value':
        return '高价值';
      case 'pending-signup':
      case 'pending_signup':
        return '待签约';
      default:
        return type;
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="mb-3">欢迎回来</Card.Title>
              <h4 className="fw-semibold">{user?.full_name || user?.username || '尊敬的用户'}</h4>
              <p className="text-muted mb-0">
                您可以通过导航栏快速进入各业务模块，系统仪表板将在后续展示关键指标。
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" className="mb-0">
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {loading ? (
        <Row className="justify-content-center py-5">
          <Col xs="auto" className="text-center text-muted">
            <Spinner animation="border" role="status" size="sm" className="me-2" />
            加载中...
          </Col>
        </Row>
      ) : (
        <>
          <Row xs={1} md={2} lg={4} className="g-4">
            {stats.map(stat => (
              <Col key={stat.title}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <Card.Subtitle className="text-muted mb-2">{stat.title}</Card.Subtitle>
                    <h2 className="fw-bold mb-3">{stat.value}</h2>
                    <p className="text-secondary mb-0" style={{ minHeight: '3rem' }}>
                      {stat.description}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 图表区域 */}
          <Row xs={1} lg={3} className="g-4 mt-2">
            {/* 渠道状态分布饼图 */}
            <Col>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">渠道状态分布</Card.Title>
                  {channelStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={channelStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={entry => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {channelStatusData.map((entry, index) => (
                            <Cell key={`channel-status-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">暂无数据</div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* 业务类型分布饼图 */}
            <Col>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">业务类型分布</Card.Title>
                  {businessTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={businessTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={entry => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {businessTypeData.map((entry, index) => (
                            <Cell key={`business-type-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">暂无数据</div>
                  )}
                </Card.Body>
              </Card>
            </Col>

          {/* 执行计划状态柱状图 */}
          <Col>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body>
                <Card.Title className="mb-3">执行计划状态</Card.Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={planStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6">
                      {planStatusData.map((entry, index) => (
                        <Cell key={`plan-status-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">{isAdminUser ? '全部渠道' : '我的渠道'}</Card.Title>
                  <Form.Control
                    type="text"
                    placeholder="搜索渠道名称或负责人..."
                    value={channelSearchTerm}
                    onChange={e => {
                      setChannelSearchTerm(e.target.value);
                      setChannelPage(1);
                    }}
                    style={{ maxWidth: '300px' }}
                  />
                </div>

                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>渠道名称</th>
                      <th>状态</th>
                      <th>业务类型</th>
                      <th>负责人</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChannels.length > 0 ? (
                      paginatedChannels.map(channel => (
                        <tr key={channel.id}>
                          <td>{channel.name}</td>
                          <td>
                            <Badge bg={getStatusVariant(channel.status)}>
                              {getStatusLabel(channel.status)}
                            </Badge>
                          </td>
                          <td>{getBusinessTypeLabel(channel.business_type)}</td>
                          <td>{channel.responsible_user}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                window.location.href = '/channels';
                              }}
                            >
                              查看详情
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted">
                          {channelSearchTerm ? '未找到匹配的渠道' : '暂无渠道'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>

                {filteredChannels.length > channelsPerPage && (
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="text-muted">
                      显示 {((channelPage - 1) * channelsPerPage) + 1}-
                      {Math.min(channelPage * channelsPerPage, filteredChannels.length)} 条，
                      共 {filteredChannels.length} 条
                    </div>
                    <div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={channelPage === 1}
                        onClick={() => setChannelPage(page => page - 1)}
                        className="me-2"
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={channelPage >= totalPages}
                        onClick={() => setChannelPage(page => page + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        </>
      )}
    </Container>
  );
};

export default DashboardPage;
