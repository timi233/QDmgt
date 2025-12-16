import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Spin,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Training {
  id: string
  title: string
  description: string
  trainingType: 'product' | 'sales' | 'technical' | 'compliance' | 'other'
  format: 'online' | 'offline' | 'hybrid'
  instructor: string
  startDate: string
  endDate: string
  capacity: number
  currentParticipants: number
  location: string | null
  materialsUrl: string | null
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
  createdBy: string
  createdAt: string
  creator?: {
    id: string
    username: string
    name: string
  }
}

interface Participant {
  id: string
  trainingId: string
  distributorId: string
  participantName: string
  participantEmail: string
  participantPhone: string | null
  registrationDate: string
  attendanceStatus: 'registered' | 'attended' | 'absent' | 'cancelled'
  completionStatus: 'not_started' | 'in_progress' | 'completed' | 'failed'
  certificateIssued: boolean
  feedback: string | null
  score: number | null
  distributor?: {
    id: string
    name: string
    region: string
  }
}

interface Distributor {
  id: string
  name: string
}

const trainingTypeMap: Record<string, { text: string; color: string }> = {
  product: { text: '产品培训', color: 'blue' },
  sales: { text: '销售培训', color: 'green' },
  technical: { text: '技术培训', color: 'purple' },
  compliance: { text: '合规培训', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const formatMap: Record<string, { text: string; color: string }> = {
  online: { text: '线上', color: 'blue' },
  offline: { text: '线下', color: 'green' },
  hybrid: { text: '混合', color: 'purple' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  planned: { text: '计划中', color: 'default' },
  ongoing: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'error' },
}

const attendanceStatusMap: Record<string, { text: string; color: string }> = {
  registered: { text: '已报名', color: 'default' },
  attended: { text: '已参加', color: 'success' },
  absent: { text: '缺席', color: 'warning' },
  cancelled: { text: '已取消', color: 'error' },
}

const completionStatusMap: Record<string, { text: string; color: string }> = {
  not_started: { text: '未开始', color: 'default' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  failed: { text: '未通过', color: 'error' },
}

export default function TrainingDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [training, setTraining] = useState<Training | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [form] = Form.useForm()

  const fetchTraining = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/trainings/${id}`)

      if (response.data.success) {
        setTraining(response.data.training)
      }
    } catch (error: any) {
      console.error('Failed to fetch training:', error)
      message.error(error.response?.data?.error || '获取培训详情失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    setParticipantsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/trainings/participants`, {
        params: {
          trainingId: id,
        },
      })

      if (response.data.success) {
        setParticipants(response.data.participants)
      }
    } catch (error: any) {
      console.error('Failed to fetch participants:', error)
      message.error(error.response?.data?.error || '获取参与者列表失败')
    } finally {
      setParticipantsLoading(false)
    }
  }

  const fetchDistributors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors`, {
        params: {
          page: 1,
          limit: 1000,
        },
      })

      if (response.data.success) {
        setDistributors(response.data.distributors)
      }
    } catch (error: any) {
      console.error('Failed to fetch distributors:', error)
    }
  }

  useEffect(() => {
    fetchTraining()
    fetchParticipants()
  }, [id])

  const handleAddParticipant = async (values: any) => {
    try {
      await axios.post(`${API_BASE_URL}/trainings/participants`, {
        trainingId: id,
        ...values,
      })
      message.success('添加参与者成功')
      setIsModalVisible(false)
      form.resetFields()
      fetchParticipants()
      fetchTraining()
    } catch (error: any) {
      console.error('Failed to add participant:', error)
      message.error(error.response?.data?.error || '添加参与者失败')
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/trainings/participants/${participantId}`)
      message.success('删除成功')
      fetchParticipants()
      fetchTraining()
    } catch (error: any) {
      console.error('Failed to delete participant:', error)
      message.error(error.response?.data?.error || '删除失败')
    }
  }

  const showModal = () => {
    fetchDistributors()
    setIsModalVisible(true)
  }

  const participantColumns: ColumnsType<Participant> = [
    {
      title: '分销商',
      key: 'distributor',
      render: (_: any, record: Participant) => record.distributor?.name || '-',
    },
    {
      title: '姓名',
      dataIndex: 'participantName',
      key: 'participantName',
    },
    {
      title: '邮箱',
      dataIndex: 'participantEmail',
      key: 'participantEmail',
    },
    {
      title: '电话',
      dataIndex: 'participantPhone',
      key: 'participantPhone',
      render: (phone: string | null) => phone || '-',
    },
    {
      title: '报名时间',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '出勤状态',
      dataIndex: 'attendanceStatus',
      key: 'attendanceStatus',
      render: (status: string) => (
        <Tag color={attendanceStatusMap[status]?.color}>{attendanceStatusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '完成状态',
      dataIndex: 'completionStatus',
      key: 'completionStatus',
      render: (status: string) => (
        <Tag color={completionStatusMap[status]?.color}>{completionStatusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      render: (score: number | null) => (score !== null ? score : '-'),
    },
    {
      title: '证书',
      dataIndex: 'certificateIssued',
      key: 'certificateIssued',
      render: (issued: boolean) => (
        <Tag color={issued ? 'success' : 'default'}>{issued ? '已颁发' : '未颁发'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Participant) => (
        <Popconfirm
          title="确定要移除这个参与者吗？"
          onConfirm={() => handleDeleteParticipant(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  if (loading || !training) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/trainings')}>
              返回
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/trainings/${id}/edit`)}
            >
              编辑
            </Button>
          </Space>
        </Card>

        <Card title="培训信息">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="培训名称" span={2}>
              {training.title}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {training.description}
            </Descriptions.Item>
            <Descriptions.Item label="培训类型">
              <Tag color={trainingTypeMap[training.trainingType]?.color}>
                {trainingTypeMap[training.trainingType]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="培训形式">
              <Tag color={formatMap[training.format]?.color}>
                {formatMap[training.format]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="讲师">{training.instructor}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[training.status]?.color}>
                {statusMap[training.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {dayjs(training.startDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {dayjs(training.endDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="人数限制">{training.capacity}</Descriptions.Item>
            <Descriptions.Item label="当前人数">{training.currentParticipants}</Descriptions.Item>
            <Descriptions.Item label="地点">{training.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="培训资料">
              {training.materialsUrl ? (
                <a href={training.materialsUrl} target="_blank" rel="noopener noreferrer">
                  查看资料
                </a>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="创建人">
              {training.creator?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(training.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={`参与者列表 (${participants.length})`}
          extra={
            <Button type="primary" icon={<UserAddOutlined />} onClick={showModal}>
              添加参与者
            </Button>
          }
        >
          <Table
            columns={participantColumns}
            dataSource={participants}
            rowKey="id"
            loading={participantsLoading}
            pagination={false}
          />
        </Card>
      </Space>

      <Modal
        title="添加参与者"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddParticipant}>
          <Form.Item
            name="distributorId"
            label="分销商"
            rules={[{ required: true, message: '请选择分销商' }]}
          >
            <Select
              showSearch
              placeholder="选择分销商"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {distributors.map((dist) => (
                <Option key={dist.id} value={dist.id}>
                  {dist.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="participantName"
            label="参与者姓名"
            rules={[{ required: true, message: '请输入参与者姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="participantEmail"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item name="participantPhone" label="电话">
            <Input placeholder="请输入电话（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false)
                  form.resetFields()
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
