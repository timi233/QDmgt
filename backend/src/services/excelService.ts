import prisma from '../utils/prisma.js'
import { validateDistributor } from '../utils/validators.js'
import { logImportEvent, logExportEvent } from './eventService.js'

/**
 * Distributor data for Excel export
 */
export interface ExportDistributorData {
  id: string
  name: string
  region: string
  contactPerson: string
  phone: string
  cooperationLevel: string
  creditLimit: number
  tags: string
  historicalPerformance: string | null
  notes: string | null
  ownerName: string
  createdAt: string
}

/**
 * Import result for a single row
 */
export interface ImportRowResult {
  row: number
  success: boolean
  data?: any
  errors?: string[]
}

/**
 * Overall import result
 */
export interface ImportResult {
  totalRows: number
  successCount: number
  failedCount: number
  results: ImportRowResult[]
}

/**
 * Distributor data from Excel import
 */
export interface ImportDistributorData {
  name: string
  region: string
  contactPerson: string
  phone: string
  cooperationLevel?: string
  creditLimit?: number
  tags?: string | string[]
  historicalPerformance?: string
  notes?: string
}

/**
 * Export distributors to structured data for Excel generation
 */
export async function exportDistributors(
  userId: string,
  userRole: string,
  filters?: {
    region?: string
    cooperationLevel?: string
  }
): Promise<ExportDistributorData[]> {
  // Build where clause
  const where: any = {
    deletedAt: null,
  }

  // Apply permission filter
  if (userRole !== 'leader' && userRole !== 'admin') {
    where.ownerUserId = userId
  }

  // Apply filters
  if (filters?.region) {
    where.region = { contains: filters.region }
  }

  if (filters?.cooperationLevel) {
    where.cooperationLevel = filters.cooperationLevel
  }

  // Fetch distributors
  const distributors = await prisma.distributor.findMany({
    where,
    include: {
      owner: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Transform to export format
  const exportData: ExportDistributorData[] = distributors.map((d) => {
    const formattedTags =
      typeof d.tags === 'string' && d.tags.length > 0
        ? d.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .join(', ')
        : ''

    return {
      id: d.id,
      name: d.name,
      region: d.region,
      contactPerson: d.contactPerson,
      phone: d.phone,
      cooperationLevel: d.cooperationLevel,
      creditLimit: d.creditLimit,
      tags: formattedTags,
      historicalPerformance: d.historicalPerformance,
      notes: d.notes,
      ownerName: d.owner.name || d.owner.username,
      createdAt: d.createdAt.toISOString().split('T')[0],
    }
  })

  // Log export event
  await logExportEvent(userId, exportData.length, {
    filters,
  })

  return exportData
}

/**
 * Get Excel export headers
 */
export function getExportHeaders(): { key: keyof ExportDistributorData; label: string }[] {
  return [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '分销商名称' },
    { key: 'region', label: '区域' },
    { key: 'contactPerson', label: '联系人' },
    { key: 'phone', label: '电话' },
    { key: 'cooperationLevel', label: '合作等级' },
    { key: 'creditLimit', label: '授信额度(万元)' },
    { key: 'tags', label: '标签' },
    { key: 'historicalPerformance', label: '历史业绩' },
    { key: 'notes', label: '备注' },
    { key: 'ownerName', label: '负责人' },
    { key: 'createdAt', label: '创建日期' },
  ]
}

/**
 * Get Excel import template headers
 */
export function getImportTemplateHeaders(): { key: string; label: string; required: boolean; example: string }[] {
  return [
    { key: 'name', label: '分销商名称', required: true, example: '示例分销商有限公司' },
    { key: 'region', label: '区域', required: true, example: '江苏省/南京市/玄武区' },
    { key: 'contactPerson', label: '联系人', required: true, example: '张三' },
    { key: 'phone', label: '电话', required: true, example: '13800138000' },
    { key: 'cooperationLevel', label: '合作等级', required: false, example: 'bronze/silver/gold/platinum' },
    { key: 'creditLimit', label: '授信额度(万元)', required: false, example: '100' },
    { key: 'tags', label: '标签(逗号分隔)', required: false, example: '重点客户, 华东区' },
    { key: 'historicalPerformance', label: '历史业绩', required: false, example: '2023年销售额500万' },
    { key: 'notes', label: '备注', required: false, example: '需要重点跟进' },
  ]
}

/**
 * Import distributors from structured data
 */
export async function importDistributors(
  data: ImportDistributorData[],
  userId: string
): Promise<ImportResult> {
  const results: ImportRowResult[] = []
  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2 // Excel rows start at 1, plus header row

    try {
      // Parse tags from comma-separated string or array
      const tags = Array.isArray(row.tags)
        ? row.tags.map((t) => t.trim()).filter((t) => t.length > 0)
        : (row.tags || '').split(',').map((t) => t.trim()).filter((t) => t.length > 0)

      // Validate cooperation level
      const validLevels = ['bronze', 'silver', 'gold', 'platinum']
      const cooperationLevel = row.cooperationLevel && validLevels.includes(row.cooperationLevel.toLowerCase())
        ? row.cooperationLevel.toLowerCase()
        : 'bronze'

      // Prepare distributor data
      const distributorData = {
        name: row.name?.trim() || '',
        region: row.region?.trim() || '',
        contactPerson: row.contactPerson?.trim() || '',
        phone: row.phone?.trim() || '',
        cooperationLevel,
        creditLimit: row.creditLimit ? Number(row.creditLimit) : 0,
        tags,
        historicalPerformance: row.historicalPerformance?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      }

      // Validate data
      const validation = await validateDistributor(distributorData)
      if (!validation.valid) {
        results.push({
          row: rowNumber,
          success: false,
          errors: Object.values(validation.errors),
        })
        failedCount++
        continue
      }

      // Check for existing non-deleted distributor with same name and region
      const existing = await prisma.distributor.findFirst({
        where: {
          name: distributorData.name,
          region: distributorData.region,
          deletedAt: null,
        },
      })
      if (existing) {
        results.push({
          row: rowNumber,
          success: false,
          errors: ['该区域已存在同名分销商'],
        })
        failedCount++
        continue
      }

      // Create distributor
      const distributor = await prisma.distributor.create({
        data: {
          ...distributorData,
          tags: distributorData.tags?.join(',') || '',
          ownerUserId: userId,
        },
      })

      // Log event
      await prisma.event.create({
        data: {
          eventType: 'distributor_created',
          entityType: 'distributor',
          entityId: distributor.id,
          userId,
          payload: JSON.stringify({
            source: 'excel_import',
            distributorName: distributor.name,
            region: distributor.region,
          }),
        },
      })

      results.push({
        row: rowNumber,
        success: true,
        data: {
          id: distributor.id,
          name: distributor.name,
        },
      })
      successCount++

    } catch (error: any) {
      const errorMessage = error.code === 'P2002'
        ? '分销商名称和区域组合已存在'
        : error.message || '未知错误'

      results.push({
        row: rowNumber,
        success: false,
        errors: [errorMessage],
      })
      failedCount++
    }
  }

  // Log import event
  await logImportEvent(userId, successCount, failedCount, {
    totalRows: data.length,
  })

  return {
    totalRows: data.length,
    successCount,
    failedCount,
    results,
  }
}

/**
 * Generate import template data
 */
export function generateImportTemplate(): ImportDistributorData[] {
  return [
    {
      name: '示例分销商一',
      region: '江苏省/南京市/玄武区',
      contactPerson: '张三',
      phone: '13800138001',
      cooperationLevel: 'bronze',
      creditLimit: 50,
      tags: '华东区, 重点',
      historicalPerformance: '2023年销售额200万',
      notes: '新客户',
    },
    {
      name: '示例分销商二',
      region: '浙江省/杭州市/西湖区',
      contactPerson: '李四',
      phone: '13800138002',
      cooperationLevel: 'silver',
      creditLimit: 100,
      tags: '华东区',
      historicalPerformance: '2023年销售额500万',
      notes: '',
    },
  ]
}
