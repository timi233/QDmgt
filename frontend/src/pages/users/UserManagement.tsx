import { useState, useEffect } from 'react'
import { Table, Card, Typography, Tag, Space, Button, message, Modal, Form, Select, Avatar, Input, Popconfirm } from 'antd'
import { EditOutlined, UserOutlined, SearchOutlined, SyncOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import axios from '@/utils/axios'
import LeaderScopeModal from '@/components/LeaderScopeModal'

const { Title } = Typography
const { Option } = Select

interface User {
  id: string
  username: string | null
  email: string | null
  name: string | null
  phone: string | null
  avatar: string | null
  department: string | null
  role: string | null
  status: string
  createdAt: string
}

const roleLabels: Record<string, string> = {
  admin: '管理员',
  leader: '主管',
  sales: '销售',
}

const statusLabels: Record<string, string> = {
  approved: '已激活',
  rejected: '已禁用',
  pending: '待审核',
}

const getRoleLabel = (role: string | null) => {
  if (!role) return '待分配'
  return roleLabels[role] || role
}

const getRoleColor = (role: string | null) => {
  if (!role) return 'default'
  const colors: Record<string, string> = {
    admin: 'red',
    leader: 'gold',
    sales: 'blue',
  }
  return colors[role] || 'default'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    approved: 'green',
    rejected: 'red',
    pending: 'orange',
  }
  return colors[status] || 'default'
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()
  const [scopeModalVisible, setScopeModalVisible] = useState(false)
  const [scopeLeader, setScopeLeader] = useState<User | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`)
      const usersData = response.data.users || []
      setUsers(usersData)
      setFilteredUsers(usersData)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!searchText) {
      setFilteredUsers(users)
    } else {
      const lowercasedSearch = searchText.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name?.toLowerCase().includes(lowercasedSearch) ||
            user.email?.toLowerCase().includes(lowercasedSearch) ||
            user.phone?.includes(searchText) ||
            user.department?.toLowerCase().includes(lowercasedSearch)
        )
      )
    }
  }, [searchText, users])

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      role: user.role,
    })
    setIsModalVisible(true)
  }

  const handleSyncFeishu = async () => {
    setSyncing(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/feishu/sync`)
      message.success(response.data.message || '同步成功')
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin/users/${id}`)
      message.success('用户删除成功')
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除用户失败')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()

      if (editingUser) {
        await axios.put(`${API_BASE_URL}/admin/users/${editingUser.id}/role`, {
          role: values.role,
        })
        message.success('角色更新成功')
      }

      setIsModalVisible(false)
      setEditingUser(null)
      form.resetFields()
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 250,
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name || record.username || '未设置'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email || record.phone || '-'}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (dept) => dept || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: '管理员', value: 'admin' },
        { text: '主管', value: 'leader' },
        { text: '销售', value: 'sales' },
        { text: '待分配', value: 'null' },
      ],
      onFilter: (value, record) => {
        if (value === 'null') return record.role === null
        return record.role === value
      },
      render: (role) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '已激活', value: 'approved' },
        { text: '已禁用', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑角色
          </Button>
          {record.role === 'leader' && (
            <Button
              type="link"
              icon={<TeamOutlined />}
              onClick={() => {
                setScopeLeader(record)
                setScopeModalVisible(true)
              }}
            >
              管理范围
            </Button>
          )}
          {record.role !== 'admin' && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              description="删除后将无法恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>用户管理</Title>
          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined spin={syncing} />}
              onClick={handleSyncFeishu}
              loading={syncing}
            >
              同步飞书组织架构
            </Button>
            <Input
              placeholder="搜索用户名、邮箱、手机或部门"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />

        <Modal
          title={`编辑用户角色 - ${editingUser?.name || editingUser?.username || '未知用户'}`}
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => {
            setIsModalVisible(false)
            setEditingUser(null)
            form.resetFields()
          }}
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              label="角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select placeholder="选择角色">
                <Option value="sales">销售</Option>
                <Option value="leader">主管</Option>
                <Option value="admin">管理员</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {scopeLeader && (
          <LeaderScopeModal
            visible={scopeModalVisible}
            leaderId={scopeLeader.id}
            leaderName={scopeLeader.name || scopeLeader.username || '未知用户'}
            onClose={() => {
              setScopeModalVisible(false)
              setScopeLeader(null)
            }}
            onSuccess={() => {}}
          />
        )}
      </Card>
    </div>
  )
}
