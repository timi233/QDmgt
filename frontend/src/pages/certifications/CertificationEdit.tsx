import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, InputNumber, Button, Space, message, Spin, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function CertificationEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchCertification = async () => {
    setFetchLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/certifications/${id}`)

      if (response.data.success) {
        const cert = response.data.certification
        form.setFieldsValue({
          ...cert,
          issueDate: dayjs(cert.issueDate),
          expiryDate: dayjs(cert.expiryDate),
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch certification:', error)
      message.error(error.response?.data?.error || '获取认证详情失败')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => {
    fetchCertification()
  }, [id])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const data = {
        ...values,
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
      }

      const response = await axios.put(`${API_BASE_URL}/certifications/${id}`, data)

      if (response.data.certification) {
        message.success('更新成功')
        navigate(`/certifications/${id}`)
      }
    } catch (error: any) {
      console.error('Failed to update certification:', error)
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/certifications/${id}`)
      message.success('认证删除成功')
      navigate('/certifications')
    } catch (error: any) {
      console.error('Failed to delete certification:', error)
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
        title="编辑认证"
        extra={
          <Space>
            <Popconfirm
              title="确定要删除这个认证吗？"
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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/certifications')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="certificationName"
            label="认证名称"
            rules={[{ required: true, message: '请输入认证名称' }]}
          >
            <Input placeholder="请输入认证名称" />
          </Form.Item>

          <Form.Item
            name="certType"
            label="认证类型"
            rules={[{ required: true, message: '请选择认证类型' }]}
          >
            <Select placeholder="选择认证类型">
              <Option value="product">产品认证</Option>
              <Option value="sales">销售认证</Option>
              <Option value="technical">技术认证</Option>
              <Option value="compliance">合规认证</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="certificationLevel"
            label="认证级别"
            rules={[{ required: true, message: '请输入认证级别' }]}
          >
            <Input placeholder="例如：初级、中级、高级" />
          </Form.Item>

          <Form.Item
            name="issueDate"
            label="颁发日期"
            rules={[{ required: true, message: '请选择颁发日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expiryDate"
            label="到期日期"
            rules={[
              { required: true, message: '请选择到期日期' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const issueDate = getFieldValue('issueDate')
                  if (!value || !issueDate || value.isAfter(issueDate)) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('到期日期必须晚于颁发日期'))
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="active">有效</Option>
              <Option value="expired">已过期</Option>
              <Option value="revoked">已撤销</Option>
            </Select>
          </Form.Item>

          <Form.Item name="score" label="分数">
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="请输入分数（可选）" />
          </Form.Item>

          <Form.Item
            name="certifiedBy"
            label="颁发人"
            rules={[{ required: true, message: '请输入颁发人' }]}
          >
            <Input placeholder="请输入颁发人姓名" />
          </Form.Item>

          <Form.Item name="documentUrl" label="证书文档链接" rules={[{ type: 'url', message: '请输入有效的URL' }]}>
            <Input placeholder="请输入证书文档链接（可选）" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(`/certifications/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
