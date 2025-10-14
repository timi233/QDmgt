import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';

interface ChannelFormData {
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  businessType: 'basic' | 'high-value' | 'pending-signup';
  contactEmail?: string;
  contactPhone?: string;
}

// 添加渠道创建功能实现

interface ChannelFormProps {
  initialData?: ChannelFormData;
  onSubmit: (data: ChannelFormData) => void;
  isEditing?: boolean;
}

const ChannelForm: React.FC<ChannelFormProps> = ({ 
  initialData = {
    name: '',
    description: '',
    status: 'active',
    businessType: 'basic',
    contactEmail: '',
    contactPhone: ''
  }, 
  onSubmit,
  isEditing = false 
}) => {
  const [formData, setFormData] = useState<ChannelFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '渠道名称是必填项';
    } else if (formData.name.length > 255) {
      newErrors.name = '渠道名称不能超过255个字符';
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = '请输入有效的邮箱地址';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting form:', err);
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
              <h4>{isEditing ? '编辑渠道' : '创建新渠道'}</h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>渠道名称 *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                    placeholder="输入渠道名称"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>描述</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    placeholder="输入渠道描述"
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>状态</Form.Label>
                      <Form.Select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">非活跃</option>
                        <option value="suspended">暂停</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>业务类型</Form.Label>
                      <Form.Select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                      >
                        <option value="basic">基本盘渠道</option>
                        <option value="high-value">高价值渠道</option>
                        <option value="pending-signup">待签约渠道</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>联系邮箱</Form.Label>
                      <Form.Control
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail || ''}
                        onChange={handleChange}
                        isInvalid={!!errors.contactEmail}
                        placeholder="输入联系邮箱"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.contactEmail}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>联系电话</Form.Label>
                      <Form.Control
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone || ''}
                        onChange={handleChange}
                        placeholder="输入联系电话"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loading}
                  className="me-2"
                >
                  {loading ? (isEditing ? '更新中...' : '创建中...') : (isEditing ? '更新渠道' : '创建渠道')}
                </Button>
                
                <Button 
                  variant="secondary" 
                  type="button"
                  onClick={() => window.history.back()}
                >
                  取消
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ChannelForm;