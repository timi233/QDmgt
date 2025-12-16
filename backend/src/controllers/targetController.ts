import { Request, Response } from 'express'
import * as targetService from '../services/targetService.js'

export async function createTarget(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const data = { ...req.body, userId }

    const target = await targetService.createTarget(data)

    res.status(201).json({
      message: '目标创建成功',
      target,
    })
  } catch (error: any) {
    console.error('Create target error:', error)
    res.status(400).json({
      error: error.message || '创建目标失败',
    })
  }
}

export async function getTargets(req: Request, res: Response) {
  try {
    const { year, quarter, month, targetType, userId } = req.query

    const filters: any = {}
    if (year) filters.year = parseInt(year as string)
    if (quarter) filters.quarter = quarter as string
    if (month) filters.month = parseInt(month as string)
    if (targetType) filters.targetType = targetType as string
    if (userId) filters.userId = userId as string

    const targets = await targetService.getTargets(filters)

    res.json({
      targets,
      total: targets.length,
    })
  } catch (error: any) {
    console.error('Get targets error:', error)
    res.status(500).json({
      error: error.message || '获取目标列表失败',
    })
  }
}

export async function getTargetById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const target = await targetService.getTargetById(id)

    res.json(target)
  } catch (error: any) {
    console.error('Get target error:', error)
    res.status(404).json({
      error: error.message || '目标不存在',
    })
  }
}

export async function updateTarget(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId
    const data = req.body

    const target = await targetService.updateTarget(id, data, userId)

    res.json({
      message: '目标更新成功',
      target,
    })
  } catch (error: any) {
    console.error('Update target error:', error)
    res.status(400).json({
      error: error.message || '更新目标失败',
    })
  }
}

export async function deleteTarget(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId

    await targetService.deleteTarget(id, userId)

    res.json({
      message: '目标删除成功',
    })
  } catch (error: any) {
    console.error('Delete target error:', error)
    res.status(400).json({
      error: error.message || '删除目标失败',
    })
  }
}

export async function getTargetStatistics(req: Request, res: Response) {
  try {
    const { year, quarter } = req.query

    const filters: any = {}
    if (year) filters.year = parseInt(year as string)
    if (quarter) filters.quarter = quarter as string

    const stats = await targetService.getTargetStatistics(filters)

    res.json(stats)
  } catch (error: any) {
    console.error('Get target statistics error:', error)
    res.status(500).json({
      error: error.message || '获取目标统计失败',
    })
  }
}
