import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  message
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const { Title } = Typography
const { TextArea } = Input
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface TaskFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline: dayjs.Dayjs
  distributorId?: string
}

export function CreateTask() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    let isMounted = true
    const fetchDistributors = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/distributors`, {
          params: { page: 1, limit: 100 }
        })
        if (isMounted) {
          // 后端返回 { distributors, pagination }，无 success 字段
          setDistributors(response.data.distributors || [])
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('获取经销商列表失败:', error)
        }
      }
    }
    fetchDistributors()
    return () => { isMounted = false }
  }, [])

  const handleSubmit = async (values: TaskFormData) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        ...values,
        deadline: values.deadline.toISOString()
      })
      // 后端返回 { task }，HTTP 201 表示成功
      if (response.data.task) {
        message.success('任务创建成功!')
        navigate('/workspace')
      } else {
        message.error(response.data.error || '创建任务失败')
      }
    } catch (error: any) {
      console.error('创建任务失败:', error)
      message.error(error.response?.data?.error || '创建任务失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
          返回
        </Button>
      </Space>

      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={3} style={{ marginBottom: 24 }}>创建新任务</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: 'medium',
            deadline: dayjs().add(1, 'day')
          }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[
              { required: true, message: '请输入任务标题' },
              { min: 2, message: '标题至少需要2个字符' },
              { max: 100, message: '标题不能超过100个字符' }
            ]}
          >
            <Input placeholder="输入任务标题" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
            rules={[
              { required: true, message: '请输入任务描述' },
              { min: 10, message: '描述至少需要10个字符' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="描述任务详情..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="distributorId"
            label="关联经销商"
          >
            <Select
              placeholder="选择经销商(可选)"
              allowClear
              showSearch
              optionFilterProp="children"
              options={distributors.map(d => ({
                value: d.id,
                label: d.name
              }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item
              name="priority"
              label="优先级"
              rules={[{ required: true, message: '请选择优先级' }]}
              style={{ flex: 1 }}
            >
              <Select
                options={[
                  { value: 'low', label: '低' },
                  { value: 'medium', label: '中' },
                  { value: 'high', label: '高' },
                  { value: 'urgent', label: '紧急' }
                ]}
              />
            </Form.Item>

            <Form.Item
              name="deadline"
              label="截止时间"
              rules={[{ required: true, message: '请选择截止时间' }]}
              style={{ flex: 1 }}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                disabledDate={current => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                创建任务
              </Button>
              <Button onClick={() => navigate('/workspace')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default CreateTask
