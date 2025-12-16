import axios, { AxiosRequestConfig } from 'axios'

const axiosInstance = axios.create({
  withCredentials: true,
})

export function deleteWithConfirm(url: string, config?: AxiosRequestConfig) {
  return axiosInstance.delete(url, {
    ...config,
    params: { ...(config?.params || {}), confirm: true }
  })
}

export default axiosInstance
