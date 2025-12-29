import React, { useState, useEffect } from 'react'
import {
  Table, Card, Form, Select, DatePicker, Modal, Tag, Space, Button, message, Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const { RangePicker } = DatePicker
const { Text } = Typography

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  LOGIN: '登录',
  UPDATE_USER_ROLE: '更新用户角色',
  ASSIGN_USER_ROLE: '分配用户角色',
  REJECT_USER: '拒绝用户',
  DELETE_USER: '删除用户',
  UPDATE_LEADER_SCOPE: '更新管辖范围',
}

const RESOURCE_LABELS: Record<string, string> = {
  Distributor: '经销商',
  Task: '任务',
  Visit: '拜访',
  User: '用户',
  SENSITIVE_OPERATION: '敏感操作',
}

const getOperationLabel = (action: string, resource: string): string => {
  // 敏感操作直接使用 action 的中文名
  if (resource === 'SENSITIVE_OPERATION') {
    return ACTION_LABELS[action] || action
  }
  const actionLabel = ACTION_LABELS[action] || action
  const resourceLabel = RESOURCE_LABELS[resource] || resource
  return `${actionLabel}${resourceLabel}`
}

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  method: string
  path: string
  ip: string
  status: number
  duration: number
  changes: any
  createdAt: string
}

export default function AuditLogList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchData = async (page = 1, pageSize = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/audit-logs`, {
        params: { page, limit: pageSize, ...currentFilters }
      })
      if (response.data.success) {
        setData(response.data.data)
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total
        })
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取审计日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSearch = (values: any) => {
    const newFilters: Record<string, any> = {}
    if (values.action) newFilters.action = values.action
    if (values.resource) newFilters.resource = values.resource
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0].format('YYYY-MM-DD')
      newFilters.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    setFilters(newFilters)
    fetchData(1, pagination.pageSize, newFilters)
  }

  const handleReset = () => {
    form.resetFields()
    setFilters({})
    fetchData(1, pagination.pageSize, {})
  }

  const columns: ColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss') },
    { title: '用户', dataIndex: 'userName', width: 100 },
    { title: '操作', key: 'operation', width: 140, render: (_, r) => <Tag color="blue">{getOperationLabel(r.action, r.resource)}</Tag> },
    { title: '资源ID', dataIndex: 'resourceId', width: 140, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80, render: (s) => <Tag color={s >= 200 && s < 300 ? 'success' : 'error'}>{s}</Tag> },
    { title: '耗时', dataIndex: 'duration', width: 80, render: (v) => `${v}ms` },
    { title: 'IP', dataIndex: 'ip', width: 120 },
  ]

  return (
    <Card title="审计日志" bordered={false}>
      <Form form={form} layout="inline" onFinish={handleSearch} style={{ marginBottom: 24 }}>
        <Form.Item name="dateRange" label="时间范围">
          <RangePicker placeholder={['开始', '结束']} />
        </Form.Item>
        <Form.Item name="action" label="操作类型">
          <Select style={{ width: 140 }} allowClear placeholder="选择操作" options={[
            { label: '创建', value: 'CREATE' },
            { label: '更新', value: 'UPDATE' },
            { label: '删除', value: 'DELETE' },
            { label: '登录', value: 'LOGIN' },
            { label: '更新用户角色', value: 'UPDATE_USER_ROLE' },
            { label: '分配用户角色', value: 'ASSIGN_USER_ROLE' },
            { label: '删除用户', value: 'DELETE_USER' },
          ]} />
        </Form.Item>
        <Form.Item name="resource" label="资源类型">
          <Select style={{ width: 120 }} allowClear placeholder="选择资源" options={[
            { label: '经销商', value: 'Distributor' },
            { label: '任务', value: 'Task' },
            { label: '拜访', value: 'Visit' },
            { label: '用户', value: 'User' },
            { label: '敏感操作', value: 'SENSITIVE_OPERATION' },
          ]} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={(p) => fetchData(p.current, p.pageSize)}
        onRow={(record) => ({ onClick: () => { setSelectedLog(record); setModalVisible(true) }, style: { cursor: 'pointer' } })}
        scroll={{ x: 1400 }}
        size="small"
      />

      <Modal title="日志详情" open={modalVisible} onCancel={() => setModalVisible(false)} footer={<Button onClick={() => setModalVisible(false)}>关闭</Button>} width={700}>
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              <p style={{ margin: '4px 0' }}><strong>用户:</strong> {selectedLog.userName} ({selectedLog.userId})</p>
              <p style={{ margin: '4px 0' }}><strong>操作:</strong> {getOperationLabel(selectedLog.action, selectedLog.resource)}</p>
              <p style={{ margin: '4px 0' }}><strong>资源ID:</strong> {selectedLog.resourceId || '-'}</p>
              <p style={{ margin: '4px 0' }}><strong>IP:</strong> {selectedLog.ip}</p>
            </div>
            <div>
              <Text strong>变更内容</Text>
              <pre style={{ background: '#282c34', color: '#abb2bf', padding: 16, borderRadius: 6, marginTop: 8, overflow: 'auto', maxHeight: 400 }}>
                {JSON.stringify(selectedLog.changes || {}, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Modal>
    </Card>
  )
}
