const FEISHU_BASE_URL = 'https://open.feishu.cn'

interface TenantTokenCache {
  token: string
  expiresAt: number
}

export interface FeishuUserInfo {
  open_id: string
  union_id?: string
  user_id?: string
  name?: string
  en_name?: string
  avatar_url?: string
  email?: string
  enterprise_email?: string
  mobile?: string
  tenant_key?: string
}

export interface FeishuDepartment {
  department_id: string
  open_department_id: string
  name: string
  parent_department_id?: string
}

export interface FeishuDepartmentMember {
  user_id: string
  open_id: string
  union_id?: string
  name?: string
  email?: string
  enterprise_email?: string
  mobile?: string
  avatar?: { avatar_origin?: string }
}

class FeishuService {
  private readonly appId: string
  private readonly appSecret: string
  private tenantToken?: TenantTokenCache

  constructor() {
    this.appId = process.env.FEISHU_APP_ID || ''
    this.appSecret = process.env.FEISHU_APP_SECRET || ''
  }

  async getTenantAccessToken(): Promise<string> {
    if (!this.appId || !this.appSecret) {
      throw new Error('飞书应用凭证未配置')
    }

    if (this.tenantToken && this.tenantToken.expiresAt > Date.now()) {
      return this.tenantToken.token
    }

    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    })

    const data = await response.json()
    if (data.code !== 0) {
      throw new Error(`获取飞书Token失败: ${data.msg}`)
    }

    this.tenantToken = {
      token: data.tenant_access_token,
      expiresAt: Date.now() + (data.expire - 60) * 1000,
    }

    return data.tenant_access_token
  }

  async getUserByCode(code: string): Promise<FeishuUserInfo> {
    const token = await this.getTenantAccessToken()

    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/authen/v1/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
      }),
    })

    const data = await response.json()
    if (data.code !== 0) {
      throw new Error(`飞书用户认证失败: ${data.msg}`)
    }

    return {
      open_id: data.data.open_id,
      union_id: data.data.union_id,
      user_id: data.data.user_id,
      name: data.data.name,
      en_name: data.data.en_name,
      avatar_url: data.data.avatar_url,
      email: data.data.email,
      enterprise_email: data.data.enterprise_email,
      mobile: data.data.mobile,
      tenant_key: data.data.tenant_key,
    }
  }

  async getDepartments(parentId = '0'): Promise<FeishuDepartment[]> {
    const token = await this.getTenantAccessToken()
    const allDepartments: FeishuDepartment[] = []
    let pageToken: string | undefined

    do {
      const url = new URL(`${FEISHU_BASE_URL}/open-apis/contact/v3/departments`)
      url.searchParams.set('parent_department_id', parentId)
      url.searchParams.set('fetch_child', 'true')
      url.searchParams.set('page_size', '50')
      if (pageToken) url.searchParams.set('page_token', pageToken)

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.code !== 0) {
        throw new Error(`获取部门列表失败: ${data.msg}`)
      }

      if (data.data?.items) {
        allDepartments.push(...data.data.items)
      }

      pageToken = data.data?.page_token
    } while (pageToken)

    return allDepartments
  }

  async getDepartmentMembers(departmentId: string): Promise<FeishuDepartmentMember[]> {
    const token = await this.getTenantAccessToken()
    const allMembers: FeishuDepartmentMember[] = []
    let pageToken: string | undefined

    do {
      const url = new URL(`${FEISHU_BASE_URL}/open-apis/contact/v3/users/find_by_department`)
      url.searchParams.set('department_id', departmentId)
      url.searchParams.set('department_id_type', 'open_department_id')
      url.searchParams.set('page_size', '50')
      if (pageToken) url.searchParams.set('page_token', pageToken)

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.code !== 0) {
        console.warn(`[飞书同步] 获取部门成员失败: ${data.msg}`)
        break
      }

      if (data.data?.items) {
        allMembers.push(...data.data.items)
      }

      pageToken = data.data?.page_token
    } while (pageToken)

    return allMembers
  }
}

export const feishuService = new FeishuService()
