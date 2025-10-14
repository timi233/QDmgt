import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';

interface TargetPlan {
  id: string;
  channelId: string;
  year: number;
  quarter: number;
  month?: number;
  performanceTarget?: number;
  opportunityTarget?: number;
  projectCountTarget?: number;
  developmentGoal?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

interface TargetPlanningProps {
  channelId: string;
}

const TargetPlanning: React.FC<TargetPlanningProps> = ({ channelId }) => {
  const [targetPlan, setTargetPlan] = useState<Omit<TargetPlan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>({
    channelId: channelId,
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    performanceTarget: undefined,
    opportunityTarget: undefined,
    projectCountTarget: undefined,
    developmentGoal: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTargetPlan(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'quarter' || name === 'month' || 
               name === 'performanceTarget' || name === 'opportunityTarget' || 
               name === 'projectCountTarget' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // This would be an API call in a real implementation
      console.log('Creating target plan:', targetPlan);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      // Reset form
      setTargetPlan({
        channelId: channelId,
        year: new Date().getFullYear(),
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        performanceTarget: undefined,
        opportunityTarget: undefined,
        projectCountTarget: undefined,
        developmentGoal: ''
      });
    } catch (err) {
      setError('Failed to create target plan. Please try again.');
      console.error('Error creating target plan:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4>目标规划</h4>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">目标规划创建成功！</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>年份</Form.Label>
                      <Form.Select
                        name="year"
                        value={targetPlan.year}
                        onChange={handleChange}
                        required
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>季度</Form.Label>
                      <Form.Select
                        name="quarter"
                        value={targetPlan.quarter}
                        onChange={handleChange}
                        required
                      >
                        {[1, 2, 3, 4].map(q => (
                          <option key={q} value={q}>第 {q} 季度</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>业绩目标 (万元)</Form.Label>
                      <Form.Control
                        type="number"
                        name="performanceTarget"
                        value={targetPlan.performanceTarget || ''}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>商机目标 (万元)</Form.Label>
                      <Form.Control
                        type="number"
                        name="opportunityTarget"
                        value={targetPlan.opportunityTarget || ''}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>项目数量目标</Form.Label>
                      <Form.Control
                        type="number"
                        name="projectCountTarget"
                        value={targetPlan.projectCountTarget || ''}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>月度 (可选)</Form.Label>
                      <Form.Select
                        name="month"
                        value={targetPlan.month || ''}
                        onChange={handleChange}
                      >
                        <option value="">全年/季度</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <option key={m} value={m}>{m}月</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>发展目标</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="developmentGoal"
                    value={targetPlan.developmentGoal}
                    onChange={handleChange}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? '创建中...' : '创建目标规划'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TargetPlanning;