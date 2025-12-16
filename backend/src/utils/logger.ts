import winston from 'winston';
import path from 'path';

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台输出格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// 创建日志目录路径
const logsDir = path.join(process.cwd(), 'logs');

// 日志配置
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'channel-backend' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // 审计日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 30, // 保留30天
    }),
  ],
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// 审计日志专用方法
export const auditLogger = {
  /**
   * 记录用户操作审计
   */
  logUserAction: (data: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ip: string;
    userAgent?: string;
    details?: any;
    success: boolean;
  }) => {
    logger.info('USER_ACTION', {
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * 记录数据修改审计
   */
  logDataChange: (data: {
    userId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    entityId: string;
    before?: any;
    after?: any;
    ip: string;
  }) => {
    logger.info('DATA_CHANGE', {
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * 记录敏感操作审计
   */
  logSensitiveOperation: (data: {
    userId: string;
    operation: string;
    details: any;
    ip: string;
    success: boolean;
  }) => {
    logger.warn('SENSITIVE_OPERATION', {
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * 记录认证事件
   */
  logAuthEvent: (data: {
    userId?: string;
    event: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'REGISTER' | 'PASSWORD_RESET';
    ip: string;
    userAgent?: string;
    success: boolean;
    reason?: string;
  }) => {
    logger.info('AUTH_EVENT', {
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...data,
    });
  },
};

export default logger;
