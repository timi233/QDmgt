import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Form, Input, Select, InputNumber, Button, Space, message, Spin, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export default function ResourceEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchResource = async () => {
    setFetchLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/resources/${id}`)

      if (response.data.success) {
        const resource = response.data.resource
        form.setFieldsValue({
          ...resource,
          tags: resource.tags.join(', '),
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch resource:', error)
      message.error(error.response?.data?.error || '获取资料详情失败')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => {
    fetchResource()
  }, [id])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const data = {
        ...values,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
      }

      const response = await axios.put(`${API_BASE_URL}/resources/${id}`, data)

      if (response.data.resource) {
        message.success('更新成功')
        navigate(`/resources/${id}`)
      }
    } catch (error: any) {
      console.error('Failed to update resource:', error)
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/resources/${id}`)
      message.success('资料删除成功')
      navigate('/resources')
    } catch (error: any) {
      console.error('Failed to delete resource:', error)
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
        title="编辑资料"
        extra={
          <Space>
            <Popconfirm
              title="确定要删除这个资料吗？"
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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/resources')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="资料名称"
            rules={[{ required: true, message: '请输入资料名称' }]}
          >
            <Input placeholder="请输入资料名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="资料描述"
            rules={[{ required: true, message: '请输入资料描述' }]}
          >
            <TextArea rows={4} placeholder="请输入资料描述" />
          </Form.Item>

          <Form.Item
            name="resourceType"
            label="资料类型"
            rules={[{ required: true, message: '请选择资料类型' }]}
          >
            <Select placeholder="选择资料类型">
              <Option value="document">文档</Option>
              <Option value="video">视频</Option>
              <Option value="image">图片</Option>
              <Option value="template">模板</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="资料分类"
            rules={[{ required: true, message: '请选择资料分类' }]}
          >
            <Select placeholder="选择资料分类">
              <Option value="product">产品资料</Option>
              <Option value="marketing">营销资料</Option>
              <Option value="training">培训资料</Option>
              <Option value="compliance">合规资料</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="fileUrl"
            label="文件链接"
            rules={[
              { required: true, message: '请输入文件链接' },
              { type: 'url', message: '请输入有效的URL' },
            ]}
          >
            <Input placeholder="请输入文件链接" />
          </Form.Item>

          <Form.Item name="thumbnailUrl" label="缩略图链接" rules={[{ type: 'url', message: '请输入有效的URL' }]}>
            <Input placeholder="请输入缩略图链接（可选）" />
          </Form.Item>

          <Form.Item
            name="fileSize"
            label="文件大小 (字节)"
            rules={[{ required: true, message: '请输入文件大小' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入文件大小" />
          </Form.Item>

          <Form.Item
            name="accessLevel"
            label="访问等级"
            rules={[{ required: true, message: '请选择访问等级' }]}
          >
            <Select placeholder="选择访问等级">
              <Option value="bronze">青铜</Option>
              <Option value="silver">白银</Option>
              <Option value="gold">黄金</Option>
              <Option value="platinum">铂金</Option>
            </Select>
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Input placeholder="请输入标签，用逗号分隔（例如：产品手册,使用指南）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(`/resources/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
