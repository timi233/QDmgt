import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStat {
  title: string;
  value: string;
  description: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats: DashboardStat[] = [
    {
      title: '渠道总数',
      value: '--',
      description: '后续将接入实时统计',
    },
    {
      title: '活跃渠道',
      value: '--',
      description: '活跃渠道占比即将上线',
    },
    {
      title: '目标完成度',
      value: '--',
      description: '目标完成情况将展示在此',
    },
    {
      title: '执行计划数',
      value: '--',
      description: '执行计划统计即将可用',
    },
  ];

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
    </Container>
  );
};

export default DashboardPage;
