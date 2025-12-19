import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  message,
  Spin,
  InputNumber,
  Popconfirm
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import axios, { deleteWithConfirm } from '@/utils/axios'

const { Title } = Typography
const { TextArea } = Input

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface WorkPlanFormData {
  distributorId: string
  year: number
  month: number
  opportunitySource: string
  projectMgmt: string
  channelActions: string
  status: string
}

export function WorkPlanEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [distributors, setDistributors] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchWorkPlan()
    fetchDistributors()
  }, [id])

  const fetchWorkPlan = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/work-plans/${id}`)
      if (response.data.success) {
        form.setFieldsValue(response.data.workPlan)
      }
    } catch (error: any) {
      console.error('获取工作计划失败:', error)
      message.error(error.response?.data?.error || '获取工作计划失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors`, {
        params: { page: 1, limit: 100 }
      })
      if (response.data.success) {
        setDistributors(response.data.distributors)
      }
    } catch (error: any) {
      console.error('获取经销商列表失败:', error)
    }
  }

  const handleSubmit = async (values: WorkPlanFormData) => {
    setSubmitting(true)
    try {
      const response = await axios.put(
        `${API_BASE_URL}/work-plans/${id}`,
        values,
        {
            'Content-Type': 'application/json'
        }
      )

      if (response.data.success) {
        message.success('工作计划更新成功')
        navigate(`/work-plans/${id}`)
      }
    } catch (error: any) {
      console.error('更新工作计划失败:', error)
      message.error(error.response?.data?.error || '更新工作计划失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteWithConfirm(`${API_BASE_URL}/work-plans/${id}`)
      message.success('工作计划删除成功')
      navigate('/work-plans')
    } catch (error: any) {
      console.error('删除工作计划失败:', error)
      message.error(error.response?.data?.error || '删除工作计划失败')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..."><div /></Spin>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/work-plans')}>
          返回列表
        </Button>
        <Popconfirm
          title="确定要删除这个工作计划吗？"
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
      </Space>

      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={3}>编辑工作计划</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="distributorId"
            label="经销商"
            rules={[{ required: true, message: '请选择经销商' }]}
          >
            <Select
              placeholder="选择经销商"
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
              name="year"
              label="年份"
              rules={[{ required: true, message: '请输入年份' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={2020}
                max={2100}
                placeholder="输入年份"
              />
            </Form.Item>

            <Form.Item
              name="month"
              label="月份"
              rules={[{ required: true, message: '请选择月份' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="选择月份"
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  label: `${i + 1}月`
                }))}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="opportunitySource"
            label="机会来源"
            rules={[
              { required: true, message: '请输入机会来源' },
              { min: 10, message: '至少需要10个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="描述机会来源..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="projectMgmt"
            label="项目管理"
            rules={[
              { required: true, message: '请输入项目管理计划' },
              { min: 10, message: '至少需要10个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="描述项目管理计划..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="channelActions"
            label="渠道动作"
            rules={[
              { required: true, message: '请输入渠道动作计划' },
              { min: 10, message: '至少需要10个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="描述渠道动作计划..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="选择状态"
              options={[
                { value: 'planning', label: '规划中' },
                { value: 'executing', label: '执行中' },
                { value: 'completed', label: '已完成' },
                { value: 'cancelled', label: '已取消' }
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                保存
              </Button>
              <Button onClick={() => navigate(`/work-plans/${id}`)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default WorkPlanEdit
