# 元征 · 合伙人赋能平台 - 后端 Dockerfile

# 基础镜像
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依赖安装阶段
FROM base AS deps

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# 开发阶段
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN pnpm db:generate

EXPOSE 3000

CMD ["pnpm", "dev"]

# 构建阶段
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm db:generate
RUN pnpm build

# 生产阶段
FROM base AS production

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# 生成 Prisma Client
RUN pnpm db:generate

EXPOSE 3000

CMD ["pnpm", "start"]






