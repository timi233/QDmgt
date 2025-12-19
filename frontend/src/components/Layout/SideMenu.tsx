import { Menu, Layout } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, HeartOutlined,
  FileTextOutlined, BookOutlined, FolderOutlined, CustomerServiceOutlined,
  SafetyCertificateOutlined, AimOutlined, DashboardOutlined, UserOutlined, AuditOutlined
} from '@ant-design/icons'
import { getCurrentUser } from '../../services/authService'

const { Sider } = Layout

interface SideMenuProps {
  collapsed: boolean
}

export default function SideMenu({ collapsed }: SideMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()

  const menuItems = [
    { key: '/workspace', icon: <HomeOutlined />, label: '工作台' },
    { key: '/distributors', icon: <TeamOutlined />, label: '分销商管理' },
    { key: '/visits', icon: <CalendarOutlined />, label: '拜访记录' },
    { key: '/health-scores', icon: <HeartOutlined />, label: '健康度管理' },
    { key: '/work-plans', icon: <FileTextOutlined />, label: '工作计划' },
    { key: '/trainings', icon: <BookOutlined />, label: '培训管理' },
    { key: '/resources', icon: <FolderOutlined />, label: '资料库' },
    { key: '/tickets', icon: <CustomerServiceOutlined />, label: '支持工单' },
    { key: '/certifications', icon: <SafetyCertificateOutlined />, label: '认证管理' },
  ]

  if (user?.role === 'leader' || user?.role === 'admin') {
    menuItems.push(
      { key: '/targets', icon: <AimOutlined />, label: '目标管理' },
      { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' }
    )
  }

  if (user?.role === 'admin') {
    menuItems.push(
      { key: '/users', icon: <UserOutlined />, label: '用户管理' },
      { key: '/audit-logs', icon: <AuditOutlined />, label: '审计日志' }
    )
  }

  const selectedKey = menuItems
    .map(item => item.key)
    .sort((a, b) => b.length - a.length)
    .find(key => location.pathname.startsWith(key)) || location.pathname

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} style={{ background: '#fff' }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ height: '100%', borderRight: 0 }}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  )
}
