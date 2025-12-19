import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, message, Spin, Button, Space, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import axios, { deleteWithConfirm } from '@/utils/axios'
import SinglePageEditForm from '../../components/DistributorForm/SinglePageEditForm'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const DistributorEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [distributor, setDistributor] = useState<any>(null)

  const fetchDistributor = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors/${id}`)
      setDistributor(response.data.distributor)
    } catch (error: any) {
      console.error('Fetch distributor error:', error)
      message.error(error.response?.data?.error || '获取经销商失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDistributor()
  }, [id])

  const handleFinish = async (values: any) => {
    await axios.put(`${API_BASE_URL}/distributors/${id}`, values)
    message.success('经销商更新成功')
    navigate(`/distributors/${id}`)
  }

  const handleCancel = () => {
    navigate(`/distributors/${id}`)
  }

  const handleDelete = async () => {
    try {
      await deleteWithConfirm(`${API_BASE_URL}/distributors/${id}`)
      message.success('经销商删除成功')
      navigate('/distributors')
    } catch (error: any) {
      console.error('Delete distributor error:', error)
      message.error(error.response?.data?.error || '删除经销商失败')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!distributor) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>未找到经销商</p>
          <Button onClick={() => navigate('/distributors')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/distributors')}
            >
              返回列表
            </Button>
            <span>编辑经销商</span>
          </Space>
        }
        extra={
          <Popconfirm
            title="确定要删除这个经销商吗？"
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
        }
      >
        <SinglePageEditForm
          initialData={distributor}
          onFinish={handleFinish}
          onCancel={handleCancel}
        />
      </Card>
    </div>
  )
}

export default DistributorEdit
