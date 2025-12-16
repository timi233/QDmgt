import prisma from './prisma.js'

/**
 * Validate name length (2-50 characters)
 */
export function validateNameLength(name: string): boolean {
  return name.length >= 2 && name.length <= 50
}

/**
 * Validate name uniqueness in a region (async)
 * @param name Distributor name
 * @param region Distributor region
 * @param excludeId Optional ID to exclude (for updates)
 */
export async function validateNameUniqueness(
  name: string,
  region: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.distributor.findFirst({
    where: {
      name,
      region,
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } }),
    },
  })
  return !existing
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
 * Expected format: "province/city/district" or structured object
 */
export function validateRegion(region: string): boolean {
  // Simple validation: must have at least 2 characters
  // In real implementation, this should validate against region database
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
 * Comprehensive distributor validation
 */
export interface DistributorValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export async function validateDistributor(
  data: {
    name: string
    region: string
    contactPerson: string
    phone: string
    cooperationLevel: string
    creditLimit?: number
    tags?: string[]
  },
  excludeId?: string
): Promise<DistributorValidationResult> {
  const errors: Record<string, string> = {}

  // Name length
  if (!validateNameLength(data.name)) {
    errors.name = 'Name must be 2-50 characters'
  }

  // Name uniqueness
  const isUnique = await validateNameUniqueness(data.name, data.region, excludeId)
  if (!isUnique) {
    errors.nameUnique = 'Distributor name already exists in this region'
  }

  // Phone format
  if (!validatePhoneFormat(data.phone)) {
    errors.phone = 'Invalid phone number format'
  }

  // Credit limit
  if (data.creditLimit !== undefined && !validateCreditLimit(data.creditLimit)) {
    errors.creditLimit = 'Credit limit must be between 0 and 999999'
  }

  // Tags count
  if (data.tags && !validateTagsCount(data.tags)) {
    errors.tags = 'Maximum 5 tags allowed'
  }

  // Region
  if (!validateRegion(data.region)) {
    errors.region = 'Invalid region format'
  }

  // Required fields
  const requiredCheck = validateRequired(data)
  if (!requiredCheck.valid) {
    errors.required = `Missing required fields: ${requiredCheck.missing.join(', ')}`
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
