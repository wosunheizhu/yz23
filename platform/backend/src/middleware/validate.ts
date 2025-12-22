/**
 * 请求验证中间件
 * 使用 Zod Schema 验证请求体、查询参数和路径参数
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError, ErrorCodes } from '../utils/errors.js';

/**
 * 验证请求中间件
 */
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodError(error);
        next(new BadRequestError(ErrorCodes.VALIDATION_ERROR, details));
      } else {
        next(error);
      }
    }
  };
};

/**
 * 验证请求体中间件
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return validateRequest({ body: schema });
};

/**
 * 验证查询参数中间件
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return validateRequest({ query: schema });
};

/**
 * 验证路径参数中间件
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  return validateRequest({ params: schema });
};

/**
 * 格式化 Zod 错误
 */
const formatZodError = (error: ZodError): Record<string, unknown> => {
  const errors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  
  return {
    fields: errors,
    message: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
};






