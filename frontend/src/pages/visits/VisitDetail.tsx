import React, { useEffect, useState } from 'react'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Popconfirm,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Rate,
  Typography,
} from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons'
import axios, { deleteWithConfirm } from '@/utils/axios'
import dayjs from 'dayjs'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

type VisitType = 'onsite' | 'online' | 'phone' | 'meeting'

interface VisitDetailResponse {
  visit: {
    id: string
    distributorId: string
    visitDate: string
    visitType: VisitType
    purpose: string
    participants?: string
    keyDiscussions?: string
    feedback?: string
    nextSteps?: string
    satisfactionScore?: number
    distributor: {
      id: string
      name: string
      region: string
      contactPerson?: string
      phone?: string
      channelTier?: string
    }
    visitor: {
      id: string
      name: string
      username: string
      email?: string
    }
  }
}

const visitTypeLabels: Record<VisitType, string> = {
  onsite: '现场拜访',
  online: '线上会议',
  phone: '电话沟通',
  meeting: '商务会议',
}

const VisitDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [visit, setVisit] = useState<VisitDetailResponse['visit'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [form] = Form.useForm()

  const getAuthHeaders = () => {
    return {
    }
  }

  const fetchVisitDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await axios.get<VisitDetailResponse>(`${API_BASE_URL}/visits/${id}`, {
        headers: getAuthHeaders(),
      })
      setVisit(response.data.visit)
    } catch (error) {
      console.error('Fetch visit detail error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '获取拜访详情失败')
      } else {
        message.error('获取拜访详情失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisitDetail()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteWithConfirm(`${API_BASE_URL}/visits/${id}`, {
        headers: getAuthHeaders(),
      })
      message.success('拜访记录已删除')
      navigate('/visits')
    } catch (error) {
      console.error('Delete visit error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '删除拜访记录失败')
      } else {
        message.error('删除拜访记录失败')
      }
    }
  }

  const openEditModal = () => {
    if (!visit) return
    form.setFieldsValue({
      visitDate: dayjs(visit.visitDate),
      visitType: visit.visitType,
      purpose: visit.purpose,
      participants: visit.participants,
      keyDiscussions: visit.keyDiscussions,
      feedback: visit.feedback,
      nextSteps: visit.nextSteps,
      satisfactionScore: visit.satisfactionScore,
    })
    setEditing(true)
  }

  const handleUpdate = async () => {
    if (!id) return
    try {
      const values = await form.validateFields()
      setUpdateLoading(true)
      await axios.put(
        `${API_BASE_URL}/visits/${id}`,
        {
          visitDate: values.visitDate ? dayjs(values.visitDate).toISOString() : undefined,
          visitType: values.visitType,
          purpose: values.purpose,
          participants: values.participants,
          keyDiscussions: values.keyDiscussions,
          feedback: values.feedback,
          nextSteps: values.nextSteps,
          satisfactionScore: values.satisfactionScore,
        },
        {
          headers: getAuthHeaders(),
        }
      )
      message.success('拜访记录已更新')
      setEditing(false)
      fetchVisitDetail()
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in (error as Record<string, unknown>)) {
        return
      }
      console.error('Update visit error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '更新拜访记录失败')
      } else {
        message.error('更新拜访记录失败')
      }
    } finally {
      setUpdateLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>未找到拜访记录</p>
          <Button onClick={() => navigate('/visits')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card
          title={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/visits')}>
                返回
              </Button>
              <span>拜访详情</span>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<EditOutlined />} onClick={openEditModal}>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这条拜访记录吗？"
                okText="删除"
                cancelText="取消"
                onConfirm={handleDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="分销商" span={2}>
              <Space direction="vertical" size={0}>
                <span>{visit.distributor?.name}</span>
                <Text type="secondary">{visit.distributor?.region}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="拜访时间">
              <Space>
                <CalendarOutlined />
                {dayjs(visit.visitDate).format('YYYY-MM-DD HH:mm')}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="拜访类型">
              <Tag color="blue">{visitTypeLabels[visit.visitType]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="拜访目的" span={2}>
              {visit.purpose}
            </Descriptions.Item>
            <Descriptions.Item label="参与方" span={2}>
              {visit.participants || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="关键讨论" span={2}>
              {visit.keyDiscussions || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="客户反馈" span={2}>
              {visit.feedback || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="下一步计划" span={2}>
              {visit.nextSteps || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="满意度">
              {typeof visit.satisfactionScore === 'number' ? (
                <Rate disabled allowHalf value={visit.satisfactionScore} />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="拜访人">
              <Space direction="vertical" size={0}>
                <span>{visit.visitor?.name || visit.visitor?.username}</span>
                <Text type="secondary">{visit.visitor?.email}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>

      <Modal
        title="编辑拜访记录"
        open={editing}
        onOk={handleUpdate}
        onCancel={() => setEditing(false)}
        confirmLoading={updateLoading}
        okText="保存"
        cancelText="取消"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="拜访时间"
            name="visitDate"
            rules={[{ required: true, message: '请选择拜访时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="拜访类型"
            name="visitType"
            rules={[{ required: true, message: '请选择拜访类型' }]}
          >
            <Select>
              <Option value="onsite">现场拜访</Option>
              <Option value="online">线上会议</Option>
              <Option value="phone">电话沟通</Option>
              <Option value="meeting">商务会议</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="拜访目的"
            name="purpose"
            rules={[{ required: true, message: '请输入拜访目的' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="参与方" name="participants">
            <Input />
          </Form.Item>
          <Form.Item label="关键讨论" name="keyDiscussions">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="客户反馈" name="feedback">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="下一步计划" name="nextSteps">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="满意度评分" name="satisfactionScore">
            <Rate allowHalf />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default VisitDetail
