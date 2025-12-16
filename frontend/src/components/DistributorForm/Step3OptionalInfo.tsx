import React from 'react'
import { Form, Input, Button, Card } from 'antd'

const { TextArea } = Input

interface Step3Props {
  initialValues?: any
  onSubmit: (values: any) => void
  onBack: () => void
  onSkip: () => void
  onCancel?: () => void
  loading?: boolean
}

const Step3OptionalInfo: React.FC<Step3Props> = ({
  initialValues,
  onSubmit,
  onBack,
  onSkip,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm()

  const handleSubmit = (values: any) => {
    onSubmit(values)
  }

  return (
    <Card title="第3步：可选信息（可跳过）">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="历史业绩"
          name="historicalPerformance"
          extra="可选：填写过往业绩、成绩或重要记录"
        >
          <TextArea
            placeholder="请输入相关业绩说明"
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="notes"
          extra="可选：填写任何补充说明"
        >
          <TextArea
            placeholder="请输入补充备注"
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button onClick={onBack} style={{ marginRight: 8 }} disabled={loading}>
            上一步
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            style={{ marginRight: 8 }}
            loading={loading}
          >
            保存
          </Button>
          <Button
            onClick={onSkip}
            style={{ marginRight: 8 }}
            loading={loading}
          >
            跳过并保存
          </Button>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              取消
            </Button>
          )}
        </Form.Item>
      </Form>
    </Card>
  )
}

export default Step3OptionalInfo
