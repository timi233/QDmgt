import { Request, Response, NextFunction } from 'express';
import logger, { auditLogger } from '../utils/logger.js';
import prisma from '../utils/prisma.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.userId,
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode >= 500) {
      logger.error('API_REQUEST', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API_REQUEST', logData);
    } else {
      logger.info('API_REQUEST', logData);
    }

    if (duration > 1000) {
      logger.warn('SLOW_REQUEST', { ...logData, message: `请求耗时过长: ${duration}ms` });
    }
  });

  next();
}

export function auditLog(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const startTime = Date.now();

    let logged = false;
    const logAudit = () => {
      if (logged || !user) return;
      logged = true;

      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      const changes: Record<string, unknown> = {};
      if (Object.keys(req.query).length) changes.query = req.query;
      if (req.method !== 'GET' && req.body) changes.body = sanitizeBody(req.body);

      persistAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action,
        resource,
        resourceId: req.params.id,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        status: res.statusCode,
        duration,
        changes: Object.keys(changes).length ? changes : undefined,
        errorMessage: success ? undefined : 'Request failed',
      });

      auditLogger.logUserAction({
        userId: user.userId,
        action,
        resource,
        resourceId: req.params.id,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        details: { method: req.method, path: req.path, query: req.query, body: sanitizeBody(req.body) },
        success,
      });
    };

    res.on('finish', logAudit);
    res.on('close', logAudit);

    next();
  };
}

export function dataChangeAudit(action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const user = (req as any).user;
    const startTime = Date.now();
    let responseBody: any;

    res.json = function (data: any): Response {
      responseBody = data;
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      if (!user || !success) return;

      const duration = Date.now() - startTime;
      const before = action === 'UPDATE' || action === 'DELETE' ? sanitizeBody((req.body as any)?._before) : undefined;
      const after = action === 'DELETE' ? undefined : sanitizeBody(responseBody);

      persistAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action,
        resource: entity,
        resourceId: req.params.id || responseBody?.id,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        status: res.statusCode,
        duration,
        changes: { before, after },
      });

      auditLogger.logDataChange({
        userId: user.userId,
        action,
        entity,
        entityId: req.params.id || responseBody?.id || 'unknown',
        before,
        after,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
    });

    next();
  };
}

export function sensitiveOperationAudit(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const user = (req as any).user;
    const startTime = Date.now();
    let responseBody: any;

    res.json = function (data: any): Response {
      responseBody = data;
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      if (!user) return;

      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      const details = {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: sanitizeBody(req.body),
        result: sanitizeBody(responseBody),
      };

      persistAuditLog({
        userId: user.userId,
        userName: user.name || user.username,
        action: operation,
        resource: 'SENSITIVE_OPERATION',
        resourceId: req.params.id,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        status: res.statusCode,
        duration,
        changes: details,
        errorMessage: success ? undefined : 'Operation failed',
      });

      auditLogger.logSensitiveOperation({
        userId: user.userId,
        operation,
        details,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        success,
      });
    });

    next();
  };
}

type AuditPayload = {
  userId?: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  duration?: number;
  changes?: unknown;
  errorMessage?: string;
};

async function persistAuditLog(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: payload.userId ?? null,
        userName: payload.userName ?? null,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId ?? null,
        method: payload.method ?? null,
        path: payload.path ?? null,
        ip: payload.ip ?? null,
        userAgent: payload.userAgent ?? null,
        status: payload.status ?? null,
        duration: payload.duration ?? null,
        changes: payload.changes ? JSON.stringify(payload.changes) : null,
        errorMessage: payload.errorMessage ?? null,
      },
    });
  } catch (error) {
    logger.error('AUDIT_LOG_PERSIST_FAILED', { error, action: payload.action, resource: payload.resource });
  }
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
