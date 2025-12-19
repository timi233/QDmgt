import React, { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, Select, Button, message, Space, Checkbox, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'

const { Option } = Select
const { TextArea } = Input

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Distributor {
  id: string
  name: string
  cooperationLevel: string
}

interface Allocation {
  newSignTarget?: number
  coreOpportunity?: number
  coreRevenue?: number
  highValueOpp?: number
  highValueRevenue?: number
}

const LEVEL_LABELS: Record<string, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
}

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'default',
  silver: 'blue',
  gold: 'gold',
  platinum: 'purple',
}

const TargetCreate: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [targetType, setTargetType] = useState<string>('quarterly')
  const [isAllocationEnabled, setIsAllocationEnabled] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([])
  const [allocations, setAllocations] = useState<Record<string, Allocation>>({})

  useEffect(() => {
    axios.get(`${API_BASE_URL}/distributors`)
      .then(res => setDistributors(res.data?.distributors || []))
      .catch(() => message.error('获取经销商列表失败'))
  }, [])

  const handleAllocationChange = (id: string, field: keyof Allocation, value: number | null) => {
    setAllocations(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value ?? undefined } }))
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const payload = { ...values }
      if (isAllocationEnabled && selectedIds.length > 0) {
        payload.distributorAllocations = selectedIds.map(id => ({
          distributorId: id as string,
          ...allocations[id as string],
        }))
      }
      await axios.post(`${API_BASE_URL}/targets`, payload)
      message.success('目标创建成功')
      navigate('/targets')
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建目标失败')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Distributor> = [
    { title: '经销商', dataIndex: 'name', key: 'name' },
    {
      title: '等级', dataIndex: 'cooperationLevel', key: 'level', width: 80,
      render: (level: string) => <Tag color={LEVEL_COLORS[level]}>{LEVEL_LABELS[level] || level}</Tag>,
    },
    {
      title: '新签', key: 'newSignTarget', width: 100,
      render: (_, r) => <InputNumber min={0} size="small" style={{ width: '100%' }} value={allocations[r.id]?.newSignTarget} onChange={v => handleAllocationChange(r.id, 'newSignTarget', v)} disabled={!selectedIds.includes(r.id)} />,
    },
    {
      title: '核心商机', key: 'coreOpportunity', width: 100,
      render: (_, r) => <InputNumber min={0} size="small" style={{ width: '100%' }} value={allocations[r.id]?.coreOpportunity} onChange={v => handleAllocationChange(r.id, 'coreOpportunity', v)} disabled={!selectedIds.includes(r.id)} />,
    },
    {
      title: '核心业绩', key: 'coreRevenue', width: 100,
      render: (_, r) => <InputNumber min={0} size="small" style={{ width: '100%' }} value={allocations[r.id]?.coreRevenue} onChange={v => handleAllocationChange(r.id, 'coreRevenue', v)} disabled={!selectedIds.includes(r.id)} />,
    },
    {
      title: '高价值商机', key: 'highValueOpp', width: 100,
      render: (_, r) => <InputNumber min={0} size="small" style={{ width: '100%' }} value={allocations[r.id]?.highValueOpp} onChange={v => handleAllocationChange(r.id, 'highValueOpp', v)} disabled={!selectedIds.includes(r.id)} />,
    },
    {
      title: '高价值业绩', key: 'highValueRevenue', width: 100,
      render: (_, r) => <InputNumber min={0} size="small" style={{ width: '100%' }} value={allocations[r.id]?.highValueRevenue} onChange={v => handleAllocationChange(r.id, 'highValueRevenue', v)} disabled={!selectedIds.includes(r.id)} />,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card title="新建目标">
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ targetType: 'quarterly', year: new Date().getFullYear() }}>
          <Form.Item label="目标类型" name="targetType" rules={[{ required: true, message: '请选择目标类型' }]}>
            <Select onChange={setTargetType}>
              <Option value="yearly">年度目标</Option>
              <Option value="quarterly">季度目标</Option>
              <Option value="monthly">月度目标</Option>
            </Select>
          </Form.Item>

          <Form.Item label="年度" name="year" rules={[{ required: true, message: '请选择年度' }]}>
            <Select>
              <Option value={2024}>2024年</Option>
              <Option value={2025}>2025年</Option>
              <Option value={2026}>2026年</Option>
            </Select>
          </Form.Item>

          {targetType === 'quarterly' && (
            <Form.Item label="季度" name="quarter" rules={[{ required: true, message: '请选择季度' }]}>
              <Select>
                <Option value="Q1">第一季度 (Q1)</Option>
                <Option value="Q2">第二季度 (Q2)</Option>
                <Option value="Q3">第三季度 (Q3)</Option>
                <Option value="Q4">第四季度 (Q4)</Option>
              </Select>
            </Form.Item>
          )}

          {targetType === 'monthly' && (
            <Form.Item label="月份" name="month" rules={[{ required: true, message: '请选择月份' }]}>
              <Select>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <Option key={m} value={m}>{m}月</Option>)}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="新签目标 (万元)" name="newSignTarget" rules={[{ required: true, message: '请输入新签目标' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入新签目标金额" />
          </Form.Item>

          <Form.Item label="核心商机目标 (万元)" name="coreOpportunity" rules={[{ required: true, message: '请输入核心商机目标' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入核心商机目标金额" />
          </Form.Item>

          <Form.Item label="核心业绩目标 (万元)" name="coreRevenue" rules={[{ required: true, message: '请输入核心业绩目标' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入核心业绩目标金额" />
          </Form.Item>

          <Form.Item label="高价值商机目标 (万元)" name="highValueOpp" rules={[{ required: true, message: '请输入高价值商机目标' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入高价值商机目标金额" />
          </Form.Item>

          <Form.Item label="高价值业绩目标 (万元)" name="highValueRevenue" rules={[{ required: true, message: '请输入高价值业绩目标' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入高价值业绩目标金额" />
          </Form.Item>

          <Form.Item label="目标描述" name="description">
            <TextArea rows={4} placeholder="请输入目标描述" />
          </Form.Item>

          <Card type="inner" title="经销商分配" size="small" style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Checkbox checked={isAllocationEnabled} onChange={e => setIsAllocationEnabled(e.target.checked)}>
                分配到经销商
              </Checkbox>
            </div>
            {isAllocationEnabled && (
              <Table
                rowKey="id"
                dataSource={distributors}
                columns={columns}
                rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
                pagination={false}
                scroll={{ x: 800 }}
                size="small"
                bordered
              />
            )}
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>创建目标</Button>
              <Button onClick={() => navigate('/targets')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default TargetCreate
