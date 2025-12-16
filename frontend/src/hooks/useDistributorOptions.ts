import { useEffect, useState, useCallback } from 'react'
import axios from '@/utils/axios'
import { message } from 'antd'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export interface DistributorOption {
  label: string
  value: string
}

export function useDistributorOptions(autoLoad: boolean = true) {
  const [options, setOptions] = useState<DistributorOption[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get<{ distributors: Array<{ id: string; name: string }> }>(`${API_BASE_URL}/distributors`, {
        headers: {
          // Token sent via httpOnly cookie,
        },
        params: {
          page: 1,
          limit: 100,
        },
      })

      const list = response.data.distributors || []
      setOptions(
        list.map((item) => ({
          label: item.name,
          value: item.id,
        }))
      )
    } catch (error) {
      console.error('Fetch distributor options error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '获取分销商列表失败')
      } else {
        message.error('获取分销商列表失败')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      fetchOptions()
    }
  }, [autoLoad, fetchOptions])

  return {
    options,
    loading,
    reload: fetchOptions,
  }
}
