import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { message } from 'antd'
import { getCurrentUser } from '../services/authService'

const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000,
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const { response } = error

    if (response) {
      switch (response.status) {
        case 401:
          if (!window.location.pathname.includes('/login')) {
            message.error('登录已过期，请重新登录')
            window.location.href = '/login'
          }
          break
        case 403:
          const user = getCurrentUser()
          if (!user?.role || user.role === 'pending') {
            message.error('您当前账户暂未分配权限，请联系管理员分配对应权限')
          } else {
            message.error('您没有权限执行此操作')
          }
          break
        case 500:
          message.error('服务器错误，请稍后重试')
          break
      }
    } else {
      if (error.message?.includes('timeout')) {
        message.error('请求超时，请检查网络')
      } else {
        message.error('网络连接失败，请检查网络设置')
      }
    }

    return Promise.reject(error)
  }
)

export function deleteWithConfirm(url: string, config?: AxiosRequestConfig) {
  return axiosInstance.delete(url, {
    ...config,
    params: { ...(config?.params || {}), confirm: true }
  })
}

export default axiosInstance
