import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * 验证请求体的中间件工厂函数
 * @param schema Zod schema用于验证请求体
 * @returns Express中间件函数
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证并转换请求体
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '请求体验证失败',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      // 非Zod错误传递给错误处理中间件
      return next(error);
    }
  };
}

/**
 * 验证查询参数的中间件工厂函数
 * @param schema Zod schema用于验证查询参数
 * @returns Express中间件函数
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证并转换查询参数
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '查询参数验证失败',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      return next(error);
    }
  };
}

/**
 * 验证路径参数的中间件工厂函数
 * @param schema Zod schema用于验证路径参数
 * @returns Express中间件函数
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证并转换路径参数
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '路径参数验证失败',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      return next(error);
    }
  };
}
