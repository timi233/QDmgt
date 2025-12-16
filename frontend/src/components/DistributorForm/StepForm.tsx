import React, { useState, useEffect } from 'react'
import { Steps, Button, message } from 'antd'
import Step1BasicInfo from './Step1BasicInfo'
import Step2ContactInfo from './Step2ContactInfo'
import Step3OptionalInfo from './Step3OptionalInfo'

const { Step } = Steps

interface StepFormProps {
  initialData?: any
  onFinish: (values: any) => void
  onCancel?: () => void
  isEdit?: boolean
}

const DRAFT_KEY = 'distributor_draft'

const StepForm: React.FC<StepFormProps> = ({ initialData, onFinish, onCancel, isEdit = false }) => {
  const [current, setCurrent] = useState(0)
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load initial data or draft
    if (initialData) {
      setFormData(initialData)
    } else if (!isEdit) {
      // Try to load draft from localStorage
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft)
          setFormData(parsedDraft)
          message.info('已加载草稿数据')
        } catch (error) {
          console.error('Failed to parse draft:', error)
        }
      }
    }
  }, [initialData, isEdit])

  useEffect(() => {
    // Auto-save draft on data change
    if (!isEdit && Object.keys(formData).length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
    }
  }, [formData, isEdit])

  const next = () => {
    setCurrent(current + 1)
  }

  const prev = () => {
    setCurrent(current - 1)
  }

  const handleStep1Submit = (values: any) => {
    setFormData({ ...formData, ...values })
    next()
  }

  const handleStep2Submit = (values: any) => {
    setFormData({ ...formData, ...values })
    next()
  }

  const handleStep3Submit = async (values: any) => {
    setLoading(true)
    try {
      const finalData = { ...formData, ...values }
      await onFinish(finalData)
      // Clear draft on success
      if (!isEdit) {
        localStorage.removeItem(DRAFT_KEY)
      }
      message.success('经销商保存成功')
    } catch (error) {
      console.error('Submit error:', error)
      message.error('保存经销商失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipStep3 = async () => {
    setLoading(true)
    try {
      await onFinish(formData)
      // Clear draft on success
      if (!isEdit) {
        localStorage.removeItem(DRAFT_KEY)
      }
      message.success('经销商保存成功')
    } catch (error) {
      console.error('Submit error:', error)
      message.error('保存经销商失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setFormData({})
    setCurrent(0)
    message.success('草稿已清除')
  }

  const steps = [
    {
      title: '基础信息',
      content: (
        <Step1BasicInfo
          initialValues={formData}
          onSubmit={handleStep1Submit}
          onCancel={onCancel}
        />
      ),
    },
    {
      title: '联系方式',
      content: (
        <Step2ContactInfo
          initialValues={formData}
          onSubmit={handleStep2Submit}
          onBack={prev}
          onCancel={onCancel}
        />
      ),
    },
    {
      title: '可选信息',
      content: (
        <Step3OptionalInfo
          initialValues={formData}
          onSubmit={handleStep3Submit}
          onBack={prev}
          onSkip={handleSkipStep3}
          onCancel={onCancel}
          loading={loading}
        />
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Steps current={current} style={{ marginBottom: 32 }}>
        {steps.map(item => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      <div style={{ minHeight: 400 }}>
        {steps[current].content}
      </div>
      {!isEdit && current === 0 && Object.keys(formData).length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="link" onClick={handleClearDraft}>
            清除已保存的草稿
          </Button>
        </div>
      )}
    </div>
  )
}

export default StepForm
