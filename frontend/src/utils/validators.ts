import axios from '../utils/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

/**
 * Validate name length (2-50 characters)
 */
export function validateNameLength(name: string): boolean {
  return name.length >= 2 && name.length <= 50
}

/**
 * Validate name uniqueness in a region (async)
 * Debounced to prevent excessive API calls
 */
let nameUniquenessTimeout: NodeJS.Timeout | null = null

export async function validateNameUniqueness(
  name: string,
  region: string,
  excludeId?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    if (nameUniquenessTimeout) {
      clearTimeout(nameUniquenessTimeout)
    }

    nameUniquenessTimeout = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/distributors`, {
          headers: {
            // Token sent via httpOnly cookie,
          },
          params: {
            search: name,
            region,
          },
        })

        const distributors = response.data.distributors || []
        const exists = distributors.some(
          (d: any) =>
            d.name === name &&
            d.region === region &&
            (!excludeId || d.id !== excludeId)
        )
        resolve(!exists)
      } catch (error) {
        console.error('Name uniqueness check failed:', error)
        resolve(true) // Allow on error to not block user
      }
    }, 300) // 300ms debounce
  })
}

/**
 * Validate phone number format
 * Supports: 11-digit mobile, landline (with area code), 400 numbers
 */
export function validatePhoneFormat(phone: string): boolean {
  const patterns = [
    /^1[3-9]\d{9}$/, // 11-digit mobile
    /^0\d{2,3}-?\d{7,8}$/, // Landline with area code
    /^400-?\d{3}-?\d{4}$/, // 400 number
  ]
  return patterns.some(pattern => pattern.test(phone))
}

/**
 * Validate credit limit (non-negative, max 999999)
 */
export function validateCreditLimit(amount: number): boolean {
  return amount >= 0 && amount <= 999999
}

/**
 * Validate tags count (max 5)
 */
export function validateTagsCount(tags: string[]): boolean {
  return Array.isArray(tags) && tags.length <= 5
}

/**
 * Validate region (three-level complete)
 */
export function validateRegion(region: string): boolean {
  return region.length >= 2
}

/**
 * Validate required fields are present
 */
export function validateRequired(fields: Record<string, any>): { valid: boolean; missing: string[] } {
  const requiredFields = ['name', 'region', 'contactPerson', 'phone', 'cooperationLevel']
  const missing = requiredFields.filter(field => !fields[field] || fields[field].toString().trim() === '')
  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Filter special characters from text
 * Removes: `~!@#$%^&*()
 */
export function filterSpecialChars(text: string): string {
  return text.replace(/[`~!@#$%^&*()]/g, '')
}

/**
 * Ant Design Form rule for name length
 */
export const nameRule = {
  validator: async (_: any, value: string) => {
    if (!value) {
      throw new Error('Name is required')
    }
    if (!validateNameLength(value)) {
      throw new Error('Name must be 2-50 characters')
    }
  },
}

/**
 * Ant Design Form rule for name uniqueness
 */
export const nameUniquenessRule = (region: string, excludeId?: string) => ({
  validator: async (_: any, value: string) => {
    if (!value || !region) {
      return
    }
    const isUnique = await validateNameUniqueness(value, region, excludeId)
    if (!isUnique) {
      throw new Error('Distributor name already exists in this region')
    }
  },
})

/**
 * Ant Design Form rule for phone format
 */
export const phoneRule = {
  validator: async (_: any, value: string) => {
    if (!value) {
      throw new Error('Phone is required')
    }
    if (!validatePhoneFormat(value)) {
      throw new Error('Invalid phone number format')
    }
  },
}

/**
 * Ant Design Form rule for credit limit
 */
export const creditLimitRule = {
  validator: async (_: any, value: number) => {
    if (value !== undefined && !validateCreditLimit(value)) {
      throw new Error('Credit limit must be between 0 and 999999')
    }
  },
}

/**
 * Ant Design Form rule for tags count
 */
export const tagsRule = {
  validator: async (_: any, value: string[]) => {
    if (value && !validateTagsCount(value)) {
      throw new Error('Maximum 5 tags allowed')
    }
  },
}
