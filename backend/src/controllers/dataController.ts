import { Request, Response } from 'express'
import { getCachedDashboardData, aggregateDashboardData } from '../services/aggregationService.js'
import {
  exportDistributors,
  importDistributors,
  getExportHeaders,
  getImportTemplateHeaders,
  generateImportTemplate,
  ImportDistributorData,
} from '../services/excelService.js'
import { queryEvents, getEntityEvents } from '../services/eventService.js'

/**
 * Get dashboard data from cache
 */
export async function getDashboardData(_req: Request, res: Response) {
  try {
    const data = await getCachedDashboardData()
    return res.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('[DataController] Error getting dashboard data:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get dashboard data',
    })
  }
}

/**
 * Force refresh dashboard data
 */
export async function refreshDashboardData(_req: Request, res: Response) {
  try {
    await aggregateDashboardData()
    const data = await getCachedDashboardData()
    return res.json({
      success: true,
      message: 'Dashboard data refreshed',
      data,
    })
  } catch (error: any) {
    console.error('[DataController] Error refreshing dashboard data:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh dashboard data',
    })
  }
}

/**
 * Export distributors to Excel format
 */
export async function exportDistributorsToExcel(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    const userId = req.user.userId
    const userRole = req.user.role
    const { region, cooperationLevel } = req.query

    const data = await exportDistributors(userId, userRole, {
      region: region as string,
      cooperationLevel: cooperationLevel as string,
    })

    return res.json({
      success: true,
      data: {
        headers: getExportHeaders(),
        rows: data,
        totalCount: data.length,
      },
    })
  } catch (error: any) {
    console.error('[DataController] Error exporting distributors:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export distributors',
    })
  }
}

/**
 * Get import template
 */
export async function getImportTemplate(_req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      data: {
        headers: getImportTemplateHeaders(),
        sampleData: generateImportTemplate(),
      },
    })
  } catch (error: any) {
    console.error('[DataController] Error getting import template:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get import template',
    })
  }
}

/**
 * Import distributors from Excel data
 */
export async function importDistributorsFromExcel(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    const userId = req.user.userId
    const { data } = req.body as { data: ImportDistributorData[] }

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import data format',
      })
    }

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data to import',
      })
    }

    if (data.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 rows per import',
      })
    }

    const result = await importDistributors(data, userId)

    return res.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[DataController] Error importing distributors:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import distributors',
    })
  }
}

/**
 * Get audit events
 */
export async function getAuditEvents(req: Request, res: Response) {
  try {
    const userRole = (req.user as any).role

    // Only leaders can view all audit events
    if (userRole !== 'leader') {
      return res.status(403).json({
        success: false,
        message: 'Only leaders can view audit events',
      })
    }

    const {
      eventType,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query

    const result = await queryEvents({
      eventType: eventType as string,
      entityType: entityType as string,
      entityId: entityId as string,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    })

    return res.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[DataController] Error getting audit events:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get audit events',
    })
  }
}

/**
 * Get events for a specific entity
 */
export async function getEntityAuditEvents(req: Request, res: Response) {
  try {
    const { entityType, entityId } = req.params

    const events = await getEntityEvents(entityType, entityId)

    return res.json({
      success: true,
      data: events,
    })
  } catch (error: any) {
    console.error('[DataController] Error getting entity events:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get entity events',
    })
  }
}
