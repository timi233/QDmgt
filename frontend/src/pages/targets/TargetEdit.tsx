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
  Row,
  Col,
  Popconfirm
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import axios, { deleteWithConfirm } from '@/utils/axios'

const { Title } = Typography
const { TextArea } = Input

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface TargetFormData {
  year: number
  quarter: string
  targetType: string
  newSignTarget: number
  coreOpportunity: number
  coreRevenue: number
  highValueOpp: number
  highValueRevenue: number
  newSignCompleted: number
  coreOppCompleted: number
  coreRevCompleted: number
  highValueOppComp: number
  highValueRevComp: number
  description: string
}

export function TargetEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTarget()
  }, [id])

  const fetchTarget = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/targets/${id}`)
      if (response.data.success) {
        form.setFieldsValue(response.data.target)
      }
    } catch (error: any) {
      console.error('获取目标失败:', error)
      message.error(error.response?.data?.error || '获取目标失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: TargetFormData) => {
    setSubmitting(true)
    try {
      const response = await axios.put(
        `${API_BASE_URL}/targets/${id}`,
        values,
        {
            'Content-Type': 'application/json'
        }
      )

      if (response.data.success) {
        message.success('目标更新成功')
        navigate(`/targets/${id}`)
      }
    } catch (error: any) {
      console.error('更新目标失败:', error)
      message.error(error.response?.data?.error || '更新目标失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteWithConfirm(`${API_BASE_URL}/targets/${id}`)
      message.success('目标删除成功')
      navigate('/targets')
    } catch (error: any) {
      console.error('删除目标失败:', error)
      message.error(error.response?.data?.error || '删除目标失败')
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/targets')}>
          返回列表
        </Button>
        <Popconfirm
          title="确定要删除这个目标吗？"
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

      <Card style={{ maxWidth: 900, margin: '0 auto' }}>
        <Title level={3}>编辑目标</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="year"
                label="年份"
                rules={[{ required: true, message: '请输入年份' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={2020}
                  max={2100}
                  placeholder="输入年份"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="quarter"
                label="季度"
                rules={[{ required: true, message: '请选择季度' }]}
              >
                <Select
                  placeholder="选择季度"
                  options={[
                    { value: 'Q1', label: 'Q1' },
                    { value: 'Q2', label: 'Q2' },
                    { value: 'Q3', label: 'Q3' },
                    { value: 'Q4', label: 'Q4' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="targetType"
                label="目标类型"
                rules={[{ required: true, message: '请选择目标类型' }]}
              >
                <Select
                  placeholder="选择类型"
                  options={[
                    { value: 'quarterly', label: '季度目标' },
                    { value: 'yearly', label: '年度目标' },
                    { value: 'monthly', label: '月度目标' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
            rules={[
              { required: true, message: '请输入描述' },
              { min: 5, message: '至少需要5个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="描述目标详情..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Title level={5}>目标值设定</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newSignTarget"
                label="新签约目标 (万)"
                rules={[{ required: true, message: '请输入新签约目标' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入目标值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="coreOpportunity"
                label="核心机会目标 (万)"
                rules={[{ required: true, message: '请输入核心机会目标' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入目标值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="coreRevenue"
                label="核心营收目标 (万)"
                rules={[{ required: true, message: '请输入核心营收目标' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入目标值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="highValueOpp"
                label="高价值机会目标 (万)"
                rules={[{ required: true, message: '请输入高价值机会目标' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入目标值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="highValueRevenue"
                label="高价值营收目标 (万)"
                rules={[{ required: true, message: '请输入高价值营收目标' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入目标值"
                />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5}>完成情况</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newSignCompleted"
                label="新签约完成 (万)"
                rules={[{ required: true, message: '请输入新签约完成值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入完成值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="coreOppCompleted"
                label="核心机会完成 (万)"
                rules={[{ required: true, message: '请输入核心机会完成值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入完成值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="coreRevCompleted"
                label="核心营收完成 (万)"
                rules={[{ required: true, message: '请输入核心营收完成值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入完成值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="highValueOppComp"
                label="高价值机会完成 (万)"
                rules={[{ required: true, message: '请输入高价值机会完成值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入完成值"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="highValueRevComp"
                label="高价值营收完成 (万)"
                rules={[{ required: true, message: '请输入高价值营收完成值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="输入完成值"
                />
              </Form.Item>
            </Col>
          </Row>

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
              <Button onClick={() => navigate(`/targets/${id}`)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default TargetEdit
