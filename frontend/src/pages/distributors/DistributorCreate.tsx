import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, message } from 'antd'
import axios from '@/utils/axios'
import StepForm from '../../components/DistributorForm/StepForm'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const DistributorCreate: React.FC = () => {
  const navigate = useNavigate()

  const handleFinish = async (values: any) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/distributors`,
        values,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      message.success('经销商创建成功')
      navigate(`/distributors/${response.data.distributor.id}`)
    } catch (error: any) {
      console.error('Create distributor error:', error)
      message.error(error.response?.data?.error || '创建经销商失败')
      throw error
    }
  }

  const handleCancel = () => {
    navigate('/distributors')
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card title="创建新分销商">
        <StepForm onFinish={handleFinish} onCancel={handleCancel} />
      </Card>
    </div>
  )
}

export default DistributorCreate
