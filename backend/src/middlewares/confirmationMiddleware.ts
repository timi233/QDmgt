import { Request, Response, NextFunction } from 'express'

/**
 * 敏感操作二次确认中间件
 *
 * 用于需要用户明确确认的敏感操作，如：
 * - 删除操作
 * - 批量删除
 * - 权限更改
 * - 密码重置
 *
 * 使用方法：
 * router.delete('/resource/:id', requireConfirmation, controller)
 *
 * 客户端需要在请求体中包含 { confirm: true } 或在查询参数中包含 ?confirm=true
 */
export function requireConfirmation(req: Request, res: Response, next: NextFunction) {
  // 检查请求体中的 confirm 字段
  const bodyConfirm = req.body?.confirm
  // 检查查询参数中的 confirm 字段
  const queryConfirm = req.query?.confirm

  // 将字符串 'true' 转换为布尔值
  const isConfirmed =
    bodyConfirm === true ||
    bodyConfirm === 'true' ||
    queryConfirm === 'true'

  if (!isConfirmed) {
    return res.status(400).json({
      error: '操作需要确认',
      message: '此操作具有风险性，需要明确确认。请在请求中包含 confirm=true 参数。',
      code: 'CONFIRMATION_REQUIRED',
    })
  }

  // 确认已提供，继续执行
  return next()
}

/**
 * 批量操作确认中间件
 *
 * 用于批量操作，除了需要确认外，还会检查操作数量
 * 如果操作数量超过阈值，需要额外确认
 */
export function requireBatchConfirmation(threshold: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 获取批量操作的ID列表
    const ids = req.body?.ids || []

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        error: '无效的批量操作请求',
        message: '请求体必须包含 ids 数组',
      })
    }

    if (ids.length === 0) {
      return res.status(400).json({
        error: '批量操作列表为空',
        message: '没有要操作的项目',
      })
    }

    // 检查是否超过阈值
    if (ids.length > threshold) {
      const batchConfirm = req.body?.batchConfirm || req.query?.batchConfirm

      const isBatchConfirmed =
        batchConfirm === true ||
        batchConfirm === 'true'

      if (!isBatchConfirmed) {
        return res.status(400).json({
          error: '批量操作需要额外确认',
          message: `您正在操作 ${ids.length} 个项目，超过了阈值 ${threshold}。请在请求中包含 batchConfirm=true 参数以确认此批量操作。`,
          code: 'BATCH_CONFIRMATION_REQUIRED',
          count: ids.length,
          threshold,
        })
      }
    }

    // 仍然需要基本确认
    return requireConfirmation(req, res, next)
  }
}

/**
 * 角色/权限更改确认中间件
 *
 * 用于角色或权限更改操作
 * 检查是否真的在更改角色，如果是则需要确认
 */
export function requireRoleChangeConfirmation(req: Request, res: Response, next: NextFunction) {
  // 检查请求体中是否包含 role 字段
  const hasRoleChange = req.body?.role !== undefined

  if (!hasRoleChange) {
    // 不涉及角色更改，直接通过
    return next()
  }

  // 涉及角色更改，需要确认
  const roleConfirm = req.body?.confirmRoleChange || req.query?.confirmRoleChange

  const isRoleChangeConfirmed =
    roleConfirm === true ||
    roleConfirm === 'true'

  if (!isRoleChangeConfirmed) {
    return res.status(400).json({
      error: '角色更改需要确认',
      message: '修改用户角色是敏感操作，需要明确确认。请在请求中包含 confirmRoleChange=true 参数。',
      code: 'ROLE_CHANGE_CONFIRMATION_REQUIRED',
      newRole: req.body.role,
    })
  }

  return next()
}
