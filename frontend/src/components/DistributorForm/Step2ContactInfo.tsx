import React from 'react'
import { Form, Input, InputNumber, Select, Button, Card } from 'antd'
import { phoneRule, creditLimitRule, tagsRule } from '../../utils/validators'

const { Option } = Select

interface Step2Props {
  initialValues?: any
  onSubmit: (values: any) => void
  onBack: () => void
  onCancel?: () => void
}

const Step2ContactInfo: React.FC<Step2Props> = ({ initialValues, onSubmit, onBack, onCancel }) => {
  const [form] = Form.useForm()

  const handleSubmit = (values: any) => {
    onSubmit(values)
  }

  return (
    <Card title="第2步：联系方式">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="联系人"
          name="contactPerson"
          rules={[
            { required: true, message: '请输入联系人' },
            { min: 2, max: 20, message: '联系人长度需为2-20个字符' },
          ]}
        >
          <Input
            placeholder="请输入联系人姓名（2-20个字符）"
            maxLength={20}
          />
        </Form.Item>

        <Form.Item
          label="联系电话"
          name="phone"
          rules={[phoneRule]}
          extra="支持：11位手机号、带区号座机或400电话"
        >
          <Input
            placeholder="请输入联系电话"
            maxLength={20}
          />
        </Form.Item>

        <Form.Item
          label="授信额度（万元）"
          name="creditLimit"
          rules={[creditLimitRule]}
          initialValue={0}
        >
          <InputNumber
            placeholder="请输入授信额度"
            min={0}
            max={999999}
            step={1}
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => Number(value!.replace(/,/g, '')) as 0 | 999999}
          />
        </Form.Item>

        <Form.Item
          label="标签"
          name="tags"
          rules={[tagsRule]}
          extra="最多5个标签"
        >
          <Select
            mode="tags"
            placeholder="选择或输入标签（最多5个）"
            maxCount={5}
            style={{ width: '100%' }}
          >
            <Option value="VIP">VIP</Option>
            <Option value="Strategic Partner">战略伙伴</Option>
            <Option value="Long-term">长期合作</Option>
            <Option value="High Volume">高成交量</Option>
            <Option value="New Partner">新合作伙伴</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button onClick={onBack} style={{ marginRight: 8 }}>
            上一步
          </Button>
          <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
            下一步
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Form.Item>
      </Form>
    </Card>
  )
}

export default Step2ContactInfo
