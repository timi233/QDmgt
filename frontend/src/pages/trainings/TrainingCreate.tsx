import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function TrainingCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const data = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      }

      const response = await axios.post(`${API_BASE_URL}/trainings`, data)

      if (response.data.training) {
        message.success('创建成功')
        navigate('/trainings')
      }
    } catch (error: any) {
      console.error('Failed to create training:', error)
      message.error(error.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="新建培训"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/trainings')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            trainingType: 'product',
            format: 'online',
            status: 'planned',
            capacity: 30,
          }}
        >
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
              <Button onClick={() => navigate('/trainings')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
