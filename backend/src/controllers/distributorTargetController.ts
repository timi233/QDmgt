import { Request, Response } from 'express'
import { distributorTargetService } from '../services/distributorTargetService.js'

export const distributorTargetController = {
  async allocate(req: Request, res: Response): Promise<void> {
    try {
      const { channelTargetId, distributorIds, overrides } = req.body
      if (!channelTargetId) {
        res.status(400).json({ error: '缺少 channelTargetId' })
        return
      }
      const targets = await distributorTargetService.allocateTargets({
        channelTargetId,
        distributorIds,
        overrides,
      })
      res.json({ targets, message: '目标分配成功' })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '目标分配失败' })
    }
  },

  async updateCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { field, value } = req.body
      if (!field || value === undefined) {
        res.status(400).json({ error: '缺少 field 或 value' })
        return
      }
      const target = await distributorTargetService.updateCompletion({
        distributorTargetId: id,
        field,
        value,
      })
      res.json({ target, message: '完成进度更新成功' })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '更新失败' })
    }
  },

  async getByChannelTarget(req: Request, res: Response): Promise<void> {
    try {
      const { channelTargetId } = req.params
      const targets = await distributorTargetService.getByChannelTarget(channelTargetId)
      res.json({ targets })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '获取失败' })
    }
  },

  async getByDistributor(req: Request, res: Response): Promise<void> {
    try {
      const { distributorId } = req.params
      const { year, quarter } = req.query
      const targets = await distributorTargetService.getByDistributor(
        distributorId,
        year ? Number(year) : undefined,
        quarter as string | undefined
      )
      res.json({ targets })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '获取失败' })
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const target = await distributorTargetService.getById(id)
      if (!target) {
        res.status(404).json({ error: '目标不存在' })
        return
      }
      res.json({ target })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '获取失败' })
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      await distributorTargetService.delete(id)
      res.json({ message: '删除成功' })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '删除失败' })
    }
  },

  async aggregate(req: Request, res: Response): Promise<void> {
    try {
      const { channelTargetId } = req.params
      const channelTarget = await distributorTargetService.aggregateToChannelTarget(channelTargetId)
      res.json({ channelTarget, message: '汇总成功' })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '汇总失败' })
    }
  },

  async createForDistributor(req: Request, res: Response): Promise<void> {
    try {
      const { distributorId } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        res.status(401).json({ error: '未授权' })
        return
      }
      const { year, quarter, month, targetType, newSignTarget, coreOpportunity, coreRevenue, highValueOpp, highValueRevenue, note } = req.body
      if (!year || !targetType) {
        res.status(400).json({ error: '缺少 year 或 targetType' })
        return
      }
      const target = await distributorTargetService.createForDistributor({
        distributorId,
        userId,
        year,
        quarter,
        month,
        targetType,
        newSignTarget,
        coreOpportunity,
        coreRevenue,
        highValueOpp,
        highValueRevenue,
        note,
      })
      res.json({ target, message: '目标创建成功' })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '创建失败' })
    }
  },
}
