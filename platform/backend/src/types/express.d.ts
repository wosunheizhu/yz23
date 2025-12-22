/**
 * Express 类型扩展
 * 元征 · 合伙人赋能平台
 */

import { DecodedToken } from '../utils/jwt.js';
import { Logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      /**
       * 请求追踪 ID
       */
      traceId: string;
      
      /**
       * 请求级日志实例
       */
      log: Logger;
      
      /**
       * 已认证用户信息（通过 authenticate 中间件设置）
       */
      user?: DecodedToken;
    }
  }
}

export {};






