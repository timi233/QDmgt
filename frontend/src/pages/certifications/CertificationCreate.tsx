import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, InputNumber, Button, Space, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Distributor {
  id: string
  name: string
}

export default function CertificationCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [form] = Form.useForm()

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
    fetchDistributors()
  }, [])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const data = {
        ...values,
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
      }

      const response = await axios.post(`${API_BASE_URL}/certifications`, data)

      if (response.data.certification) {
        message.success('创建成功')
        navigate('/certifications')
      }
    } catch (error: any) {
      console.error('Failed to create certification:', error)
      message.error(error.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="新建认证"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/certifications')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            certType: 'product',
          }}
        >
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
              <Button onClick={() => navigate('/certifications')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
