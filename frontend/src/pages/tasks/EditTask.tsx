import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Spin,
  message,
  Typography
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const { Title } = Typography
const { TextArea } = Input
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline: string
  distributorId?: string | null
  distributor?: {
    id: string
    name: string
  }
}

interface Distributor {
  id: string
  name: string
  region: string
}

interface FormValues {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline: dayjs.Dayjs
  distributorId?: string | null
}

export function EditTask() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, distributorRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/tasks/${id}`),
          axios.get(`${API_BASE_URL}/distributors`)
        ])

        const task: Task = taskRes.data.task
        setDistributors(distributorRes.data.distributors || [])

        form.setFieldsValue({
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          deadline: dayjs(task.deadline),
          distributorId: task.distributorId || undefined
        })
      } catch (error: any) {
        console.error('获取数据失败:', error)
        message.error(error.response?.data?.error || '获取任务数据失败')
        navigate('/workspace')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, form, navigate])

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        deadline: values.deadline.toISOString(),
        distributorId: values.distributorId === undefined ? null : values.distributorId
      }

      await axios.put(`${API_BASE_URL}/tasks/${id}`, payload)
      message.success('任务更新成功')
      navigate(`/tasks/${id}`)
    } catch (error: any) {
      console.error('更新任务失败:', error)
      message.error(error.response?.data?.error || '更新任务失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/tasks/${id}`)}>
          返回
        </Button>
      </Space>

      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>编辑任务</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[
              { required: true, message: '请输入任务标题' },
              { max: 200, message: '标题最多200个字符' }
            ]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={4} placeholder="请输入任务描述（可选）" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="请选择优先级">
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="urgent">紧急</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="截止时间"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="请选择截止时间"
            />
          </Form.Item>

          <Form.Item
            name="distributorId"
            label="关联经销商"
          >
            <Select
              allowClear
              placeholder="请选择关联的经销商（可选）"
              showSearch
              optionFilterProp="label"
              options={distributors.map(d => ({
                value: d.id,
                label: `${d.name} - ${d.region}`
              }))}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                保存
              </Button>
              <Button onClick={() => navigate(`/tasks/${id}`)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default EditTask
