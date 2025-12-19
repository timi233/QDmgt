import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: '获取审计日志失败' });
  }
});

router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [totalLogs, actionStats, resourceStats] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.groupBy({ by: ['action'], _count: true, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      prisma.auditLog.groupBy({ by: ['resource'], _count: true, orderBy: { _count: { resource: 'desc' } }, take: 10 }),
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        actionStats: actionStats.map(s => ({ action: s.action, count: s._count })),
        resourceStats: resourceStats.map(s => ({ resource: s.resource, count: s._count })),
      },
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ success: false, error: '获取审计统计失败' });
  }
});

export default router;
