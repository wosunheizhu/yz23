/**
 * 测试环境设置
 */

import { beforeAll, afterAll } from 'vitest';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'silent';

beforeAll(async () => {
  // 测试开始前的设置
});

afterAll(async () => {
  // 测试结束后的清理
});






