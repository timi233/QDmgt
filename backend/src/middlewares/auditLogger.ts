import { Request, Response, NextFunction } from 'express';
import logger, { auditLogger } from '../utils/logger.js';

/**
 * API请求日志中间件
 * 记录所有API请求的详细信息
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // 记录请求信息
  const requestInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.userId,
  };

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // 根据状态码选择日志级别
    if (res.statusCode >= 500) {
      logger.error('API_REQUEST', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API_REQUEST', logData);
    } else {
      logger.info('API_REQUEST', logData);
    }

    // 慢请求警告（超过1秒）
    if (duration > 1000) {
      logger.warn('SLOW_REQUEST', {
        ...logData,
        message: `请求耗时过长: ${duration}ms`,
      });
    }
  });

  next();
}

/**
 * 审计日志中间件
 * 记录重要的用户操作
 */
export function auditLog(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const user = (req as any).user;

    // 拦截响应
    res.send = function (data: any): Response {
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // 记录审计日志
      if (user) {
        auditLogger.logUserAction({
          userId: user.userId,
          action,
          resource,
          resourceId: req.params.id,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent'),
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizeBody(req.body),
          },
          success,
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * 数据修改审计中间件
 * 用于CREATE、UPDATE、DELETE操作
 */
export function dataChangeAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entity: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const user = (req as any).user;

    res.json = function (data: any): Response {
      const success = res.statusCode >= 200 && res.statusCode < 400;

      if (user && success) {
        auditLogger.logDataChange({
          userId: user.userId,
          action,
          entity,
          entityId: req.params.id || data?.id || 'unknown',
          before: action === 'UPDATE' || action === 'DELETE' ? req.body._before : undefined,
          after: action !== 'DELETE' ? sanitizeBody(data) : undefined,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 敏感操作审计中间件
 * 用于批量删除、权限修改等敏感操作
 */
export function sensitiveOperationAudit(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const user = (req as any).user;

    res.json = function (data: any): Response {
      const success = res.statusCode >= 200 && res.statusCode < 400;

      if (user) {
        auditLogger.logSensitiveOperation({
          userId: user.userId,
          operation,
          details: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: sanitizeBody(req.body),
            result: sanitizeBody(data),
          },
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          success,
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 清理敏感数据
 * 从日志中移除密码等敏感字段
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
