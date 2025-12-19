import React, { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Space,
  message,
  Rate,
  Row,
  Col,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'
import dayjs, { Dayjs } from 'dayjs'
import { useDistributorOptions } from '../../hooks/useDistributorOptions'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

type VisitType = 'onsite' | 'online' | 'phone' | 'meeting'

interface VisitFormValues {
  distributorId: string
  visitDate: Dayjs
  visitType: VisitType
  purpose: string
  ourAttendees?: string
  clientAttendees?: string
  keyDiscussions?: string
  feedback?: string
  competitorInfo?: string
  nextSteps?: string
  satisfactionScore?: number
}

const VisitCreate: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { options: distributorOptions, loading: distributorLoading } = useDistributorOptions()

  const handleSubmit = async (values: VisitFormValues) => {
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE_URL}/visits`, {
        distributorId: values.distributorId,
        visitDate: dayjs(values.visitDate).toISOString(),
        visitType: values.visitType,
        purpose: values.purpose,
        ourAttendees: values.ourAttendees,
        clientAttendees: values.clientAttendees,
        keyDiscussions: values.keyDiscussions,
        feedback: values.feedback,
        competitorInfo: values.competitorInfo,
        nextSteps: values.nextSteps,
        satisfactionScore: values.satisfactionScore,
      })
      message.success('拜访记录创建成功')
      navigate('/visits')
    } catch (error) {
      console.error('Create visit error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '创建拜访记录失败')
      } else {
        message.error('创建拜访记录失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="新建拜访记录"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/visits')}>
            返回列表
          </Button>
        }
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="分销商"
                name="distributorId"
                rules={[{ required: true, message: '请选择分销商' }]}
              >
                <Select
                  placeholder="选择分销商"
                  loading={distributorLoading}
                  options={distributorOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="拜访日期"
                name="visitDate"
                rules={[{ required: true, message: '请选择拜访日期' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="拜访类型"
                name="visitType"
                rules={[{ required: true, message: '请选择拜访类型' }]}
              >
                <Select placeholder="选择拜访类型">
                  <Option value="onsite">现场拜访</Option>
                  <Option value="online">线上会议</Option>
                  <Option value="phone">电话沟通</Option>
                  <Option value="meeting">商务会议</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="拜访目的"
                name="purpose"
                rules={[{ required: true, message: '请输入拜访目的' }]}
              >
                <Input placeholder="例如：需求调研、项目跟进" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="我方人员" name="ourAttendees">
                <Input placeholder="请输入我方参与人员" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="对方人员" name="clientAttendees">
                <Input placeholder="请输入对方参与人员" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="关键讨论" name="keyDiscussions">
            <TextArea rows={3} placeholder="记录关键讨论要点" />
          </Form.Item>

          <Form.Item label="沟通结果" name="feedback">
            <TextArea rows={3} placeholder="记录沟通结果与客户态度" />
          </Form.Item>

          <Form.Item label="竞品动态" name="competitorInfo">
            <TextArea rows={3} placeholder="记录竞品相关信息" />
          </Form.Item>

          <Form.Item label="后续行动" name="nextSteps">
            <TextArea rows={3} placeholder="下一步行动计划" />
          </Form.Item>

          <Form.Item label="客情健康度" name="satisfactionScore">
            <Rate allowHalf tooltips={['1分', '2分', '3分', '4分', '5分']} />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate('/visits')}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={submitting}>
              保存
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}

export default VisitCreate
