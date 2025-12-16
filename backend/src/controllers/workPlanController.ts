import { Request, Response } from 'express'
import * as workPlanService from '../services/workPlanService.js'

export async function createWorkPlan(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const data = { ...req.body, userId }

    const workPlan = await workPlanService.createWorkPlan(data)

    res.status(201).json({
      message: '工作计划创建成功',
      workPlan,
    })
  } catch (error: any) {
    console.error('Create work plan error:', error)
    res.status(400).json({
      error: error.message || '创建工作计划失败',
    })
  }
}

export async function getWorkPlans(req: Request, res: Response) {
  try {
    const { distributorId, userId, year, month, status } = req.query

    const filters: any = {}
    if (distributorId) filters.distributorId = distributorId as string
    if (userId) filters.userId = userId as string
    if (year) filters.year = parseInt(year as string)
    if (month) filters.month = parseInt(month as string)
    if (status) filters.status = status as string

    const workPlans = await workPlanService.getWorkPlans(filters)

    res.json({
      workPlans,
      total: workPlans.length,
    })
  } catch (error: any) {
    console.error('Get work plans error:', error)
    res.status(500).json({
      error: error.message || '获取工作计划列表失败',
    })
  }
}

export async function getWorkPlanById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const workPlan = await workPlanService.getWorkPlanById(id)

    res.json(workPlan)
  } catch (error: any) {
    console.error('Get work plan error:', error)
    res.status(404).json({
      error: error.message || '工作计划不存在',
    })
  }
}

export async function updateWorkPlan(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId
    const data = req.body

    const workPlan = await workPlanService.updateWorkPlan(id, data, userId)

    res.json({
      message: '工作计划更新成功',
      workPlan,
    })
  } catch (error: any) {
    console.error('Update work plan error:', error)
    res.status(400).json({
      error: error.message || '更新工作计划失败',
    })
  }
}

export async function deleteWorkPlan(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId

    await workPlanService.deleteWorkPlan(id, userId)

    res.json({
      message: '工作计划删除成功',
    })
  } catch (error: any) {
    console.error('Delete work plan error:', error)
    res.status(400).json({
      error: error.message || '删除工作计划失败',
    })
  }
}

export async function createWeeklyReview(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const data = req.body

    const weeklyReview = await workPlanService.createWeeklyReview(data, userId)

    res.status(201).json({
      message: '周报创建成功',
      weeklyReview,
    })
  } catch (error: any) {
    console.error('Create weekly review error:', error)
    res.status(400).json({
      error: error.message || '创建周报失败',
    })
  }
}

export async function updateWeeklyReview(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId
    const data = req.body

    const weeklyReview = await workPlanService.updateWeeklyReview(id, data, userId)

    res.json({
      message: '周报更新成功',
      weeklyReview,
    })
  } catch (error: any) {
    console.error('Update weekly review error:', error)
    res.status(400).json({
      error: error.message || '更新周报失败',
    })
  }
}

export async function deleteWeeklyReview(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId

    await workPlanService.deleteWeeklyReview(id, userId)

    res.json({
      message: '周报删除成功',
    })
  } catch (error: any) {
    console.error('Delete weekly review error:', error)
    res.status(400).json({
      error: error.message || '删除周报失败',
    })
  }
}
