import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Modal, Form, Spinner } from 'react-bootstrap';
import { Channel } from '../types';
import { channelService, ChannelStatus, BusinessType } from '../services/channel.service';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormatter';

type ChannelFormValues = {
  name: string;
  description: string;
  status: '' | 'active' | 'inactive' | 'suspended';
  business_type: '' | 'basic' | 'high-value' | 'pending-signup';
  contact_person: string;
  contact_email: string;
  contact_phone: string;
};

const createEmptyChannelFormValues = (): ChannelFormValues => ({
  name: '',
  description: '',
  status: '',
  business_type: '',
  contact_person: '',
  contact_email: '',
  contact_phone: ''
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

const ChannelsPage: React.FC = () => {
  const { isManagerOrAdmin } = useAuth();
  const canManageChannels = isManagerOrAdmin();
  const canCreateChannel = canManageChannels;
  const canDeleteChannel = canManageChannels;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [createFormData, setCreateFormData] = useState<ChannelFormValues>(() => createEmptyChannelFormValues());
  const [editFormData, setEditFormData] = useState<ChannelFormValues>(() => createEmptyChannelFormValues());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<null | 'create' | 'edit' | 'delete'>(null);
  const fetchChannels = useCallback(async () => {
    setLoading(true);

    try {
      const response = await channelService.getChannels();
      setChannels(response.channels);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, '加载渠道数据失败');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels().catch(() => {});
  }, [fetchChannels]);

  const handleCreateChannel = () => {
    setCreateFormData(createEmptyChannelFormValues());
    setShowCreateModal(true);
  };

  const handleViewChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowViewModal(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowEditModal(true);
  };

  const handleConfirmDelete = (channel: Channel) => {
    setChannelToDelete(channel);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedChannel(null);
    setCreateFormData(createEmptyChannelFormValues());
    setEditFormData(createEmptyChannelFormValues());
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setChannelToDelete(null);
  };

  useEffect(() => {
    if (showEditModal && selectedChannel) {
      setEditFormData({
        name: selectedChannel.name,
        description: selectedChannel.description ?? '',
        status: selectedChannel.status,
        business_type: selectedChannel.business_type,
        contact_person: selectedChannel.contact_person ?? '',
        contact_email: selectedChannel.contact_email ?? '',
        contact_phone: selectedChannel.contact_phone ?? ''
      });
    } else if (!showEditModal) {
      setEditFormData(createEmptyChannelFormValues());
    }
  }, [selectedChannel, showEditModal]);

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionLoading('create');
    setError(null);

    try {
      await channelService.createChannel({
        name: createFormData.name,
        description: createFormData.description || undefined,
        status: (createFormData.status || 'active') as ChannelStatus,
        business_type: (createFormData.business_type || 'basic') as BusinessType,
        contact_person: createFormData.contact_person || undefined,
        contact_email: createFormData.contact_email || undefined,
        contact_phone: createFormData.contact_phone || undefined,
      });

      setShowCreateModal(false);
      setCreateFormData(createEmptyChannelFormValues());

      await fetchChannels();
      setSuccessMessage('渠道已成功创建');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '创建渠道失败');
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedChannel) {
      return;
    }
    setActionLoading('edit');
    setError(null);

    const channelId = selectedChannel.id;

    try {
      await channelService.updateChannel(channelId, {
        name: editFormData.name,
        description: editFormData.description || undefined,
        status: editFormData.status ? (editFormData.status as ChannelStatus) : undefined,
        business_type: editFormData.business_type ? (editFormData.business_type as BusinessType) : undefined,
        contact_person: editFormData.contact_person || undefined,
        contact_email: editFormData.contact_email || undefined,
        contact_phone: editFormData.contact_phone || undefined,
      });

      setShowEditModal(false);
      setSelectedChannel(null);
      setEditFormData(createEmptyChannelFormValues());

      await fetchChannels();
      setSuccessMessage('渠道信息已成功更新');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '更新渠道失败');
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) {
      return;
    }

    setActionLoading('delete');
    setError(null);

    try {
      await channelService.deleteChannel(channelToDelete.id);

      setShowDeleteModal(false);
      setChannelToDelete(null);

      await fetchChannels();
      setSuccessMessage('渠道已成功删除');
    } catch (err) {
      setSuccessMessage(null);
      const message = getErrorMessage(err, '删除渠道失败');
      setError(message);
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
              <Card.Title>渠道管理</Card.Title>
              {canCreateChannel && (
                <Button variant="primary" className="float-end" onClick={handleCreateChannel}>
                  添加渠道
                </Button>
              )}
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
                    <th>渠道名称</th>
                    <th>状态</th>
                    <th>业务类型</th>
                    <th>联系人</th>
                    <th>联系邮箱</th>
                    <th>联系电话</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        <Spinner animation="border" role="status" size="sm" className="me-2" />
                        正在加载渠道...
                      </td>
                    </tr>
                  ) : channels.length > 0 ? (
                    channels.map(channel => (
                      <tr key={channel.id}>
                        <td>{channel.name}</td>
                        <td>
                          <span
                            className={
                              channel.status === 'active' ? 'text-success' :
                              channel.status === 'inactive' ? 'text-warning' : 'text-danger'
                            }
                          >
                            {channel.status === 'active' ? '活跃' :
                             channel.status === 'inactive' ? '非活跃' : '暂停'}
                          </span>
                        </td>
                        <td>
                          {channel.business_type === 'basic' ? '基本盘渠道' :
                           channel.business_type === 'high-value' ? '高价值渠道' : '待签约渠道'}
                        </td>
                        <td>{channel.contact_person || '-'}</td>
                        <td>{channel.contact_email || '-'}</td>
                        <td>{channel.contact_phone || '-'}</td>
                        <td>{formatDate(channel.created_at)}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleViewChannel(channel)}
                          >
                            查看
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEditChannel(channel)}
                          >
                            编辑
                          </Button>
                          {canDeleteChannel && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleConfirmDelete(channel)}
                            >
                              删除
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        暂无渠道数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <Modal show={showCreateModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>添加渠道</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form id="createChannelForm" onSubmit={handleSubmitCreate}>
                    <Form.Group className="mb-3" controlId="createChannelName">
                      <Form.Label>渠道名称</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        value={createFormData.name}
                        onChange={event => setCreateFormData(prev => ({ ...prev, name: event.target.value }))}
                        placeholder="请输入渠道名称"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelDescription">
                      <Form.Label>渠道描述</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={createFormData.description}
                        onChange={event => setCreateFormData(prev => ({ ...prev, description: event.target.value }))}
                        placeholder="请输入渠道描述"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelStatus">
                      <Form.Label>状态</Form.Label>
                      <Form.Select
                        required
                        value={createFormData.status}
                        onChange={event => setCreateFormData(prev => ({ ...prev, status: event.target.value as ChannelFormValues['status'] }))}
                      >
                        <option value="">请选择状态</option>
                        <option value="active">活跃</option>
                        <option value="inactive">非活跃</option>
                        <option value="suspended">暂停</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelBusinessType">
                      <Form.Label>业务类型</Form.Label>
                      <Form.Select
                        required
                        value={createFormData.business_type}
                        onChange={event => setCreateFormData(prev => ({ ...prev, business_type: event.target.value as ChannelFormValues['business_type'] }))}
                      >
                        <option value="">请选择业务类型</option>
                        <option value="basic">基本盘渠道</option>
                        <option value="high-value">高价值渠道</option>
                        <option value="pending-signup">待签约渠道</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelContactPerson">
                      <Form.Label>联系人</Form.Label>
                      <Form.Control
                        type="text"
                        value={createFormData.contact_person}
                        onChange={event => setCreateFormData(prev => ({ ...prev, contact_person: event.target.value }))}
                        placeholder="请输入联系人"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelEmail">
                      <Form.Label>联系邮箱</Form.Label>
                      <Form.Control
                        type="email"
                        value={createFormData.contact_email}
                        onChange={event => setCreateFormData(prev => ({ ...prev, contact_email: event.target.value }))}
                        placeholder="请输入联系邮箱"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="createChannelPhone">
                      <Form.Label>联系电话</Form.Label>
                      <Form.Control
                        type="tel"
                        value={createFormData.contact_phone}
                        onChange={event => setCreateFormData(prev => ({ ...prev, contact_phone: event.target.value }))}
                        placeholder="请输入联系电话"
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
                    form="createChannelForm"
                    disabled={actionLoading === 'create'}
                  >
                    {actionLoading === 'create' ? (
                      <>
                        <Spinner
                          animation="border"
                          role="status"
                          size="sm"
                          className="me-2"
                        />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal>

              <Modal show={showViewModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>查看渠道</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {selectedChannel ? (
                    <div>
                      <p><strong>渠道名称：</strong>{selectedChannel.name}</p>
                      <p><strong>渠道描述：</strong>{selectedChannel.description || '-'}</p>
                      <p><strong>状态：</strong>{
                        selectedChannel.status === 'active' ? '活跃' :
                        selectedChannel.status === 'inactive' ? '非活跃' : '暂停'
                      }</p>
                      <p><strong>业务类型：</strong>{
                        selectedChannel.business_type === 'basic' ? '基本盘渠道' :
                        selectedChannel.business_type === 'high-value' ? '高价值渠道' : '待签约渠道'
                      }</p>
                      <p><strong>联系人：</strong>{selectedChannel.contact_person || '-'}</p>
                      <p><strong>联系邮箱：</strong>{selectedChannel.contact_email || '-'}</p>
                      <p><strong>联系电话：</strong>{selectedChannel.contact_phone || '-'}</p>
                    </div>
                  ) : (
                    <p>未选中任何渠道。</p>
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
                </Modal.Footer>
              </Modal>

              <Modal show={showEditModal} onHide={handleCloseModals} centered>
                <Modal.Header closeButton>
                  <Modal.Title>编辑渠道</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {selectedChannel ? (
                    <Form id="editChannelForm" onSubmit={handleSubmitEdit}>
                      <Form.Group className="mb-3" controlId="editChannelName">
                        <Form.Label>渠道名称</Form.Label>
                        <Form.Control
                          type="text"
                          required
                          value={editFormData.name}
                          onChange={event => setEditFormData(prev => ({ ...prev, name: event.target.value }))}
                          placeholder="请输入渠道名称"
                        />
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelDescription">
                        <Form.Label>渠道描述</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editFormData.description}
                          onChange={event => setEditFormData(prev => ({ ...prev, description: event.target.value }))}
                          placeholder="请输入渠道描述"
                        />
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelStatus">
                        <Form.Label>状态</Form.Label>
                        <Form.Select
                          required
                          value={editFormData.status}
                          onChange={event => setEditFormData(prev => ({ ...prev, status: event.target.value as ChannelFormValues['status'] }))}
                        >
                          <option value="">请选择状态</option>
                          <option value="active">活跃</option>
                          <option value="inactive">非活跃</option>
                          <option value="suspended">暂停</option>
                        </Form.Select>
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelBusinessType">
                        <Form.Label>业务类型</Form.Label>
                        <Form.Select
                          required
                          value={editFormData.business_type}
                          onChange={event => setEditFormData(prev => ({ ...prev, business_type: event.target.value as ChannelFormValues['business_type'] }))}
                        >
                          <option value="">请选择业务类型</option>
                          <option value="basic">基本盘渠道</option>
                          <option value="high-value">高价值渠道</option>
                          <option value="pending-signup">待签约渠道</option>
                        </Form.Select>
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelContactPerson">
                        <Form.Label>联系人</Form.Label>
                        <Form.Control
                          type="text"
                          value={editFormData.contact_person}
                          onChange={event => setEditFormData(prev => ({ ...prev, contact_person: event.target.value }))}
                          placeholder="请输入联系人"
                        />
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelEmail">
                        <Form.Label>联系邮箱</Form.Label>
                        <Form.Control
                          type="email"
                          value={editFormData.contact_email}
                          onChange={event => setEditFormData(prev => ({ ...prev, contact_email: event.target.value }))}
                          placeholder="请输入联系邮箱"
                        />
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="editChannelPhone">
                        <Form.Label>联系电话</Form.Label>
                        <Form.Control
                          type="tel"
                          value={editFormData.contact_phone}
                          onChange={event => setEditFormData(prev => ({ ...prev, contact_phone: event.target.value }))}
                          placeholder="请输入联系电话"
                        />
                      </Form.Group>
                    </Form>
                  ) : (
                    <p>未选中任何渠道。</p>
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
                    form="editChannelForm"
                    disabled={!selectedChannel || actionLoading === 'edit'}
                  >
                    {actionLoading === 'edit' ? (
                      <>
                        <Spinner
                          animation="border"
                          role="status"
                          size="sm"
                          className="me-2"
                        />
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
                  <Modal.Title>删除渠道</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {channelToDelete ? (
                    <p>
                      确认删除渠道 <strong>{channelToDelete.name}</strong> 吗？此操作不可撤销。
                    </p>
                  ) : (
                    <p>未选中任何渠道。</p>
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
                    onClick={handleDeleteChannel}
                    disabled={!channelToDelete || actionLoading === 'delete'}
                  >
                    {actionLoading === 'delete' ? (
                      <>
                        <Spinner
                          animation="border"
                          role="status"
                          size="sm"
                          className="me-2"
                        />
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

export default ChannelsPage;
