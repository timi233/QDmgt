import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Form,
  Modal,
  Badge
} from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaUser, FaUsers, FaShieldAlt } from 'react-icons/fa';
import { formatDate } from '../utils/dateFormatter';

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  businessType: 'basic' | 'high-value' | 'pending-signup';
}

interface Assignment {
  id: string;
  userId: string;
  channelId: string;
  permissionLevel: 'read' | 'write' | 'admin';
  assignedAt: string;
  assignedBy: string;
  targetResponsibility: boolean;
  user?: User;
  channel?: Channel;
}

interface AssignmentFormData {
  userId: string;
  channelId: string;
  permissionLevel: 'read' | 'write' | 'admin';
  targetResponsibility: boolean;
}

interface AssignmentManagementProps {
  channelId?: string;
  userId?: string;
  onAssignmentCreated?: (assignment: Assignment) => void;
  onAssignmentUpdated?: (assignment: Assignment) => void;
  onAssignmentDeleted?: (assignmentId: string) => void;
}

const AssignmentManagement: React.FC<AssignmentManagementProps> = ({ 
  channelId, 
  userId,
  onAssignmentCreated,
  onAssignmentUpdated,
  onAssignmentDeleted
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    userId: '',
    channelId: channelId || '',
    permissionLevel: 'read',
    targetResponsibility: false
  });
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Mock data - in a real implementation, this would come from an API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock users
        const mockUsers: User[] = [
          { id: '1', username: 'admin', email: 'admin@example.com', fullName: '系统管理员', role: 'admin' },
          { id: '2', username: 'manager1', email: 'manager1@example.com', fullName: '业务经理1', role: 'manager' },
          { id: '3', username: 'user1', email: 'user1@example.com', fullName: '普通用户1', role: 'user' },
          { id: '4', username: 'manager2', email: 'manager2@example.com', fullName: '业务经理2', role: 'manager' },
          { id: '5', username: 'user2', email: 'user2@example.com', fullName: '普通用户2', role: 'user' }
        ];
        
        // Mock channels
        const mockChannels: Channel[] = [
          { id: '1', name: '基本盘渠道-1', description: '主要客户渠道', status: 'active', businessType: 'basic' },
          { id: '2', name: '高价值渠道-1', description: '战略合作伙伴', status: 'active', businessType: 'high-value' },
          { id: '3', name: '待签约渠道-1', description: '潜在合作伙伴', status: 'inactive', businessType: 'pending-signup' },
          { id: '4', name: '基本盘渠道-2', description: '维护客户渠道', status: 'suspended', businessType: 'basic' }
        ];
        
        // Mock assignments
        const mockAssignments: Assignment[] = [
          { 
            id: '1', 
            userId: '2', 
            channelId: '1', 
            permissionLevel: 'admin', 
            assignedAt: '2025-01-15T10:30:00Z', 
            assignedBy: '1',
            targetResponsibility: true,
            user: mockUsers.find(u => u.id === '2'),
            channel: mockChannels.find(c => c.id === '1')
          },
          { 
            id: '2', 
            userId: '3', 
            channelId: '1', 
            permissionLevel: 'write', 
            assignedAt: '2025-02-20T09:15:00Z', 
            assignedBy: '1',
            targetResponsibility: false,
            user: mockUsers.find(u => u.id === '3'),
            channel: mockChannels.find(c => c.id === '1')
          },
          { 
            id: '3', 
            userId: '4', 
            channelId: '2', 
            permissionLevel: 'admin', 
            assignedAt: '2025-03-05T13:20:00Z', 
            assignedBy: '1',
            targetResponsibility: true,
            user: mockUsers.find(u => u.id === '4'),
            channel: mockChannels.find(c => c.id === '2')
          }
        ];
        
        setUsers(mockUsers);
        setChannels(mockChannels);
        
        // Filter assignments based on props
        let filteredAssignments = mockAssignments;
        if (channelId) {
          filteredAssignments = filteredAssignments.filter(a => a.channelId === channelId);
        }
        if (userId) {
          filteredAssignments = filteredAssignments.filter(a => a.userId === userId);
        }
        
        setAssignments(filteredAssignments);
      } catch (err) {
        setError('Failed to load assignment data');
        console.error('Error loading assignment data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [channelId, userId]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle create assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create mock assignment
      const newAssignment: Assignment = {
        id: Math.random().toString(36).substring(2, 9),
        ...formData,
        assignedAt: new Date().toISOString(),
        assignedBy: '1', // Mock current user ID
        user: users.find(u => u.id === formData.userId),
        channel: channels.find(c => c.id === formData.channelId)
      };
      
      setAssignments(prev => [...prev, newAssignment]);
      setShowCreateModal(false);
      setFormData({
        userId: '',
        channelId: channelId || '',
        permissionLevel: 'read',
        targetResponsibility: false
      });
      
      if (onAssignmentCreated) {
        onAssignmentCreated(newAssignment);
      }
    } catch (err) {
      setError('Failed to create assignment');
      console.error('Error creating assignment:', err);
    }
  };

  // Handle edit assignment
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      userId: assignment.userId,
      channelId: assignment.channelId,
      permissionLevel: assignment.permissionLevel,
      targetResponsibility: assignment.targetResponsibility
    });
    setShowEditModal(true);
  };

  // Handle update assignment
  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAssignment) return;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update assignment
      const updatedAssignment: Assignment = {
        ...editingAssignment,
        ...formData,
        user: users.find(u => u.id === formData.userId),
        channel: channels.find(c => c.id === formData.channelId)
      };
      
      setAssignments(prev => 
        prev.map(a => a.id === editingAssignment.id ? updatedAssignment : a)
      );
      
      setShowEditModal(false);
      setEditingAssignment(null);
      setFormData({
        userId: '',
        channelId: channelId || '',
        permissionLevel: 'read',
        targetResponsibility: false
      });
      
      if (onAssignmentUpdated) {
        onAssignmentUpdated(updatedAssignment);
      }
    } catch (err) {
      setError('Failed to update assignment');
      console.error('Error updating assignment:', err);
    }
  };

  // Handle delete assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('确定要删除此分配吗？')) {
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      
      if (onAssignmentDeleted) {
        onAssignmentDeleted(assignmentId);
      }
    } catch (err) {
      setError('Failed to delete assignment');
      console.error('Error deleting assignment:', err);
    }
  };

  // Get permission level badge variant
  const getPermissionBadgeVariant = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'admin': return 'danger';
      case 'write': return 'warning';
      case 'read': return 'info';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">加载分配信息...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5>
              <FaUsers className="me-2" />
              渠道分配管理
            </h5>
          </Col>
          <Col xs="auto">
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus className="me-1" /> 添加分配
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>用户</th>
                <th>渠道</th>
                <th>权限等级</th>
                <th>目标责任</th>
                <th>分配时间</th>
                <th>分配人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length > 0 ? (
                assignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td>
                      <div>
                        <strong>{assignment.user?.fullName || assignment.user?.username}</strong>
                        <br />
                        <small className="text-muted">{assignment.user?.email}</small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{assignment.channel?.name}</strong>
                        <br />
                        <small className="text-muted">{assignment.channel?.description}</small>
                      </div>
                    </td>
                    <td>
                      <Badge bg={getPermissionBadgeVariant(assignment.permissionLevel)}>
                        {assignment.permissionLevel === 'admin' ? '管理员' : 
                         assignment.permissionLevel === 'write' ? '写入' : '只读'}
                      </Badge>
                    </td>
                    <td>
                      {assignment.targetResponsibility ? (
                        <Badge bg="success">是</Badge>
                      ) : (
                        <Badge bg="secondary">否</Badge>
                      )}
                    </td>
                    <td>
                      {formatDate(assignment.assignedAt)}
                    </td>
                    <td>
                      {/* In a real implementation, you would show the assigner's name */}
                      系统管理员
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleEditAssignment(assignment)}
                        >
                          <FaEdit />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center">
                    未找到分配信息
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        
        <Row className="mt-3">
          <Col className="d-flex justify-content-center">
            <div>总计: {assignments.length} 个分配</div>
          </Col>
        </Row>
      </Card.Body>

      {/* Create Assignment Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="me-2" />
            添加渠道分配
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateAssignment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>用户 *</Form.Label>
              <Form.Select
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                required
              >
                <option value="">请选择用户</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.username} ({user.email})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            {!channelId && (
              <Form.Group className="mb-3">
                <Form.Label>渠道 *</Form.Label>
                <Form.Select
                  name="channelId"
                  value={formData.channelId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">请选择渠道</option>
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} - {channel.description}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>权限等级 *</Form.Label>
              <Form.Select
                name="permissionLevel"
                value={formData.permissionLevel}
                onChange={handleInputChange}
                required
              >
                <option value="read">只读</option>
                <option value="write">写入</option>
                <option value="admin">管理员</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="targetResponsibility"
                label="目标责任"
                checked={formData.targetResponsibility}
                onChange={handleInputChange}
              />
              <Form.Text className="text-muted">
                选中表示该用户对该渠道的目标负责
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button variant="primary" type="submit">
              创建分配
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEdit className="me-2" />
            编辑渠道分配
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateAssignment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>用户</Form.Label>
              <Form.Control
                type="text"
                value={editingAssignment?.user?.fullName || editingAssignment?.user?.username || ''}
                readOnly
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>渠道</Form.Label>
              <Form.Control
                type="text"
                value={editingAssignment?.channel?.name || ''}
                readOnly
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>权限等级 *</Form.Label>
              <Form.Select
                name="permissionLevel"
                value={formData.permissionLevel}
                onChange={handleInputChange}
                required
              >
                <option value="read">只读</option>
                <option value="write">写入</option>
                <option value="admin">管理员</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="targetResponsibility"
                label="目标责任"
                checked={formData.targetResponsibility}
                onChange={handleInputChange}
              />
              <Form.Text className="text-muted">
                选中表示该用户对该渠道的目标负责
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button variant="primary" type="submit">
              更新分配
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default AssignmentManagement;