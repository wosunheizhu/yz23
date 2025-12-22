# 元征 · 合伙人赋能平台 - 后端 Dockerfile

# 基础镜像
FROM node:20-alpine AS base

# 安装 OpenSSL 和其他必要依赖
RUN apk add --no-cache openssl libc6-compat

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

# 生产阶段 (使用 tsx 运行时编译)
FROM base AS production

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# 生成 Prisma Client
RUN pnpm db:generate

EXPOSE 3000

# 使用 npx tsx 运行（更兼容）
CMD ["npx", "tsx", "src/app.ts"]
