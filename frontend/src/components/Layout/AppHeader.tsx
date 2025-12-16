import { Button, Space, Typography } from 'antd'
import { LogoutOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { logout, isAuthenticated, getCurrentUser } from '../../services/authService'

const { Title } = Typography

interface AppHeaderProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

export default function AppHeader({ collapsed, setCollapsed }: AppHeaderProps) {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()
  const user = getCurrentUser()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        {authenticated && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        )}
        <Title level={3} style={{ margin: '16px 0' }}>
          渠道管理系统
        </Title>
      </Space>

      {authenticated && user && (
        <Space>
          <Button type="text" icon={<UserOutlined />} onClick={() => navigate('/profile')}>
            {user.name || user.username} ({
              user.role === 'admin' ? '管理员' :
              user.role === 'leader' ? '主管' :
              user.role === 'sales' ? '销售' : '待分配'
            })
          </Button>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </Space>
      )}
    </div>
  )
}
