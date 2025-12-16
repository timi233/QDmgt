import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  message,
  Spin,
  Popconfirm,
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function TrainingEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchTraining = async () => {
    setFetchLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/trainings/${id}`)

      if (response.data.success) {
        const training = response.data.training
        form.setFieldsValue({
          ...training,
          startDate: dayjs(training.startDate),
          endDate: dayjs(training.endDate),
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch training:', error)
      message.error(error.response?.data?.error || '获取培训详情失败')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => {
    fetchTraining()
  }, [id])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const data = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      }

      const response = await axios.put(`${API_BASE_URL}/trainings/${id}`, data)

      if (response.data.training) {
        message.success('更新成功')
        navigate(`/trainings/${id}`)
      }
    } catch (error: any) {
      console.error('Failed to update training:', error)
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/trainings/${id}`)
      message.success('培训删除成功')
      navigate('/trainings')
    } catch (error: any) {
      console.error('Failed to delete training:', error)
      message.error(error.response?.data?.error || '删除失败')
    }
  }

  if (fetchLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="编辑培训"
        extra={
          <Space>
            <Popconfirm
              title="确定要删除这个培训吗？"
              description="删除后将无法恢复"
              onConfirm={handleDelete}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/trainings')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="培训名称"
            rules={[{ required: true, message: '请输入培训名称' }]}
          >
            <Input placeholder="请输入培训名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="培训描述"
            rules={[{ required: true, message: '请输入培训描述' }]}
          >
            <TextArea rows={4} placeholder="请输入培训描述" />
          </Form.Item>

          <Form.Item
            name="trainingType"
            label="培训类型"
            rules={[{ required: true, message: '请选择培训类型' }]}
          >
            <Select placeholder="选择培训类型">
              <Option value="product">产品培训</Option>
              <Option value="sales">销售培训</Option>
              <Option value="technical">技术培训</Option>
              <Option value="compliance">合规培训</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="format"
            label="培训形式"
            rules={[{ required: true, message: '请选择培训形式' }]}
          >
            <Select placeholder="选择培训形式">
              <Option value="online">线上</Option>
              <Option value="offline">线下</Option>
              <Option value="hybrid">混合</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="instructor"
            label="讲师"
            rules={[{ required: true, message: '请输入讲师名称' }]}
          >
            <Input placeholder="请输入讲师名称" />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="结束时间"
            rules={[
              { required: true, message: '请选择结束时间' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue('startDate')
                  if (!value || !startDate || value.isAfter(startDate)) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('结束时间必须晚于开始时间'))
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="人数限制"
            rules={[{ required: true, message: '请输入人数限制' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入人数限制" />
          </Form.Item>

          <Form.Item name="location" label="培训地点">
            <Input placeholder="请输入培训地点（线下或混合培训需填写）" />
          </Form.Item>

          <Form.Item name="materialsUrl" label="培训资料链接">
            <Input placeholder="请输入培训资料链接（可选）" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="planned">计划中</Option>
              <Option value="ongoing">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(`/trainings/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
