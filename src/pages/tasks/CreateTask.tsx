import React, { useState } from 'react'
import {
  Layout,
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  message,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../../services/taskService'
import type { CreateTaskInput } from '../../types/task'
import dayjs from 'dayjs'

const { Content } = Layout
const { TextArea } = Input
const { Option } = Select

export const CreateTask: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const taskData: CreateTaskInput = {
        distributorId: values.distributorId,
        assignedUserId: values.assignedUserId,
        title: values.title,
        description: values.description,
        deadline: values.deadline.toISOString(),
        priority: values.priority || 'medium',
      }

      const task = await createTask(taskData)
      message.success('Task created successfully')
      navigate(`/tasks/${task.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <Space style={{ marginBottom: 24 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作台
          </Button>
        </Space>

        <Card title="新建任务">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              priority: 'medium',
            }}
          >
            <Form.Item
              label="任务标题"
              name="title"
              rules={[
                { required: true, message: '请输入任务标题' },
                { max: 200, message: '标题不能超过200个字符' },
              ]}
            >
              <Input placeholder="输入任务标题" maxLength={200} showCount />
            </Form.Item>

            <Form.Item
              label="任务描述"
              name="description"
            >
              <TextArea
                rows={4}
                placeholder="输入任务描述(可选)"
                maxLength={1000}
                showCount
              />
            </Form.Item>

            <Form.Item
              label="分销商ID"
              name="distributorId"
              rules={[{ required: true, message: '请输入分销商ID' }]}
            >
              <Input placeholder="输入分销商ID" />
            </Form.Item>

            <Form.Item
              label="负责人ID"
              name="assignedUserId"
              rules={[{ required: true, message: '请输入负责人ID' }]}
            >
              <Input placeholder="输入负责人ID" />
            </Form.Item>

            <Form.Item
              label="截止时间"
              name="deadline"
              rules={[{ required: true, message: '请选择截止时间' }]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder="选择截止时间"
                disabledDate={(current) => {
                  return current && current < dayjs().startOf('day')
                }}
              />
            </Form.Item>

            <Form.Item
              label="优先级"
              name="priority"
              rules={[{ required: true, message: '请选择优先级' }]}
            >
              <Select placeholder="选择优先级">
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
                <Option value="urgent">紧急</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  创建任务
                </Button>
                <Button onClick={() => navigate('/workspace')}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  )
}
