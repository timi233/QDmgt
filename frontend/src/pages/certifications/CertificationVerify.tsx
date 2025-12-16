import { useState } from 'react'
import { Card, Input, Button, Space, message, Descriptions, Tag, Result } from 'antd'
import { SafetyOutlined, SearchOutlined } from '@ant-design/icons'
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

export default function CertificationVerify() {
  const [loading, setLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [certification, setCertification] = useState<Certification | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      message.warning('请输入验证码')
      return
    }

    setLoading(true)
    try {
    setNotFound(false)
    setCertification(null)

    try {
      const response = await axios.get(
        `${API_BASE_URL}/certifications/verify/${encodeURIComponent(verificationCode)}`
      )

      if (response.data.success) {
        setCertification(response.data.certification)
        message.success('验证成功')
      }
    } catch (error: any) {
      console.error('Failed to verify certification:', error)
      if (error.response?.status === 404) {
        setNotFound(true)
      } else {
        message.error(error.response?.data?.error || '验证失败')
      }
    
    }
} finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>认证验证</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <p>请输入认证验证码以验证认证的真实性：</p>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="请输入认证验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                onKeyPress={handleKeyPress}
                size="large"
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleVerify}
                loading={loading}
                size="large"
              >
                验证
              </Button>
            </Space.Compact>
          </div>

          {notFound && (
            <Result
              status="warning"
              title="未找到认证"
              subTitle="输入的验证码不存在或已被撤销，请检查后重试。"
            />
          )}

          {certification && (
            <Card
              title="认证信息"
              type="inner"
              style={{
                borderColor: statusMap[certification.status]?.color,
                borderWidth: 2,
              }}
            >
              <Descriptions column={1} bordered>
                <Descriptions.Item label="认证状态">
                  <Tag
                    color={statusMap[certification.status]?.color}
                    style={{ fontSize: 16, padding: '4px 12px' }}
                  >
                    {statusMap[certification.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="认证名称">
                  {certification.certificationName}
                </Descriptions.Item>
                <Descriptions.Item label="分销商">
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
                {certification.score !== null && (
                  <Descriptions.Item label="分数">{certification.score}</Descriptions.Item>
                )}
                <Descriptions.Item label="颁发日期">
                  {dayjs(certification.issueDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="到期日期">
                  {dayjs(certification.expiryDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="颁发人">{certification.certifiedBy}</Descriptions.Item>
                <Descriptions.Item label="验证码">
                  <code style={{ fontSize: 14 }}>{certification.verificationCode}</code>
                </Descriptions.Item>
              </Descriptions>

              {certification.status === 'active' && (
                <Result
                  status="success"
                  title="此认证有效"
                  subTitle={`该认证将于 ${dayjs(certification.expiryDate).format('YYYY年MM月DD日')} 到期`}
                  style={{ marginTop: 24 }}
                />
              )}

              {certification.status === 'expired' && (
                <Result
                  status="warning"
                  title="此认证已过期"
                  subTitle="请联系认证颁发机构了解更新流程"
                  style={{ marginTop: 24 }}
                />
              )}

              {certification.status === 'revoked' && (
                <Result
                  status="error"
                  title="此认证已被撤销"
                  subTitle="该认证已不再有效"
                  style={{ marginTop: 24 }}
                />
              )}
            </Card>
          )}
        </Space>
      </Card>
    </div>
  )
}
