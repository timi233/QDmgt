import { useEffect, useState } from 'react'
import { Modal, Transfer, message, Spin } from 'antd'
import type { TransferProps } from 'antd'
import axios from '@/utils/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface LeaderScopeModalProps {
  visible: boolean
  leaderId: string
  leaderName: string
  onClose: () => void
  onSuccess: () => void
}

interface RecordType {
  key: string
  title: string
  description: string
}

interface SalesUser {
  id: string
  username: string
  name?: string
  email?: string
  role: string
}

export default function LeaderScopeModal({
  visible,
  leaderId,
  leaderName,
  onClose,
  onSuccess,
}: LeaderScopeModalProps) {
  const [dataSource, setDataSource] = useState<RecordType[]>([])
  const [targetKeys, setTargetKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible && leaderId) {
      fetchData()
    }
  }, [visible, leaderId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, scopeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/users`),
        axios.get(`${API_BASE_URL}/admin/users/${leaderId}/scope`),
      ])

      const salesUsers: SalesUser[] = (usersRes.data.users || []).filter(
        (u: SalesUser) => u.role === 'sales'
      )
      const managedIds: string[] = (scopeRes.data.managedSales || []).map(
        (s: SalesUser) => s.id
      )

      setDataSource(
        salesUsers.map((u) => ({
          key: u.id,
          title: u.name || u.username,
          description: u.email || '',
        }))
      )
      setTargetKeys(managedIds)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChange: TransferProps['onChange'] = (newTargetKeys) => {
    setTargetKeys(newTargetKeys as string[])
  }

  const filterOption = (inputValue: string, option: RecordType) =>
    option.title.toLowerCase().includes(inputValue.toLowerCase()) ||
    option.description.toLowerCase().includes(inputValue.toLowerCase())

  const handleOk = async () => {
    setSaving(true)
    try {
      await axios.put(`${API_BASE_URL}/admin/users/${leaderId}/scope`, {
        salesIds: targetKeys,
      })
      message.success('管理范围更新成功')
      onSuccess()
      onClose()
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`管理 ${leaderName} 的销售负责范围`}
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      width={700}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
    >
      <Spin spinning={loading}>
        <Transfer
          dataSource={dataSource}
          showSearch
          filterOption={filterOption}
          targetKeys={targetKeys}
          onChange={handleChange}
          render={(item) => item.title}
          titles={['未分配销售', '已分配销售']}
          listStyle={{ width: 300, height: 350 }}
          operations={['添加', '移除']}
          locale={{
            itemUnit: '人',
            itemsUnit: '人',
            searchPlaceholder: '搜索',
          }}
        />
      </Spin>
    </Modal>
  )
}
