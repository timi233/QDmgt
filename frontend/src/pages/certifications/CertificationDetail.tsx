import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, message, Spin } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Certification {
  id: string
  distributorId: string
  certType: 'product' | 'sales' | 'technical' | 'compliance'
  certificationName: string
  certificationLevel: string
  issueDate: string
  expiryDate: string
  verificationCode: string
  status: 'active' | 'expired' | 'revoked'
  score: number | null
  certifiedBy: string
  notes: string | null
  documentUrl: string | null
  createdAt: string
  updatedAt: string
  distributor?: {
    id: string
    name: string
    tier: string
    region: string
  }
}

const certTypeMap: Record<string, { text: string; color: string }> = {
  product: { text: '产品认证', color: 'blue' },
  sales: { text: '销售认证', color: 'green' },
  technical: { text: '技术认证', color: 'purple' },
  compliance: { text: '合规认证', color: 'orange' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '有效', color: 'success' },
  expired: { text: '已过期', color: 'default' },
  revoked: { text: '已撤销', color: 'error' },
}

export default function CertificationDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [certification, setCertification] = useState<Certification | null>(null)

  const fetchCertification = async () => {
    setLoading(true)
    try {

      const response = await axios.get(`${API_BASE_URL}/certifications/${id}`)

      if (response.data.success) {
        setCertification(response.data.certification)
    
      }
} catch (error: any) {
      console.error('Failed to fetch certification:', error)
      message.error(error.response?.data?.error || '获取认证详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCertification()
  }, [id])

  if (loading || !certification) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/certifications')}>
              返回
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/certifications/${id}/edit`)}
            >
              编辑
            </Button>
            {certification.documentUrl && (
              <Button
                icon={<DownloadOutlined />}
                onClick={() => window.open(certification.documentUrl!, '_blank', 'noopener,noreferrer')}
              >
                下载证书
              </Button>
            )}
          </Space>
        </Card>

        <Card title="认证信息">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="认证名称" span={2}>
              {certification.certificationName}
            </Descriptions.Item>
            <Descriptions.Item label="分销商" span={2}>
              {certification.distributor?.name}
              {certification.distributor?.region && ` (${certification.distributor.region})`}
            </Descriptions.Item>
            <Descriptions.Item label="认证类型">
              <Tag color={certTypeMap[certification.certType]?.color}>
                {certTypeMap[certification.certType]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="认证级别">
              {certification.certificationLevel}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[certification.status]?.color}>
                {statusMap[certification.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="分数">
              {certification.score !== null ? certification.score : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="颁发日期">
              {dayjs(certification.issueDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="到期日期">
              {dayjs(certification.expiryDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="验证码" span={2}>
              <code style={{ fontSize: 16, fontWeight: 'bold' }}>
                {certification.verificationCode}
              </code>
            </Descriptions.Item>
            <Descriptions.Item label="颁发人">{certification.certifiedBy}</Descriptions.Item>
            <Descriptions.Item label="分销商等级">
              {certification.distributor?.tier || '-'}
            </Descriptions.Item>
            {certification.notes && (
              <Descriptions.Item label="备注" span={2}>
                {certification.notes}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {dayjs(certification.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(certification.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  )
}
