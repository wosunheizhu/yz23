/**
 * 数据库种子数据
 * 用于初始化开发/测试环境
 */

import { PrismaClient, RoleLevel, VisibilityScopeType, VenueStatus, BusinessType, ProjectReviewStatus, ProjectBusinessStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Token 初始额度配置
const TOKEN_INITIAL_AMOUNTS = {
  FOUNDER: 100000,
  CORE_PARTNER: 30000,
  PARTNER: 10000,
};

async function main(): Promise<void> {
  console.log('🌱 开始创建种子数据...');

  // 创建管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yuanzheng.com' },
    update: {},
    create: {
      email: 'admin@yuanzheng.com',
      phone: '13800000001',
      passwordHash: adminPassword,
      name: '系统管理员',
      roleLevel: RoleLevel.FOUNDER,
      isAdmin: true,
      joinedAt: new Date(),
      selfDescription: '元征平台系统管理员',
      expertiseAreas: ['系统管理', '平台运营'],
      tokenAccount: {
        create: {
          balance: TOKEN_INITIAL_AMOUNTS.FOUNDER,
          initialAmount: TOKEN_INITIAL_AMOUNTS.FOUNDER,
        },
      },
    },
  });
  console.log(`✅ 创建管理员账号: ${admin.email}`);

  // 创建联合创始人
  const founderPassword = await bcrypt.hash('founder123', 10);
  const founder = await prisma.user.upsert({
    where: { email: 'founder@yuanzheng.com' },
    update: {},
    create: {
      email: 'founder@yuanzheng.com',
      phone: '13800000002',
      passwordHash: founderPassword,
      name: '张联创',
      gender: '男',
      roleLevel: RoleLevel.FOUNDER,
      isAdmin: false,
      joinedAt: new Date('2024-01-01'),
      selfDescription: '专注于一级市场投资，擅长并购重组与产业整合',
      expertiseAreas: ['并购重组', '一级市场', '产业整合'],
      organization: '元大投资',
      organizationPublic: true,
      tags: ['金融', '投资', '并购'],
      tokenAccount: {
        create: {
          balance: TOKEN_INITIAL_AMOUNTS.FOUNDER,
          initialAmount: TOKEN_INITIAL_AMOUNTS.FOUNDER,
        },
      },
    },
  });
  console.log(`✅ 创建联合创始人: ${founder.name}`);

  // 创建核心合伙人
  const corePartnerPassword = await bcrypt.hash('core123', 10);
  const corePartner = await prisma.user.upsert({
    where: { email: 'core@yuanzheng.com' },
    update: {},
    create: {
      email: 'core@yuanzheng.com',
      phone: '13800000003',
      passwordHash: corePartnerPassword,
      name: '李核心',
      gender: '女',
      roleLevel: RoleLevel.CORE_PARTNER,
      isAdmin: false,
      joinedAt: new Date('2024-03-01'),
      selfDescription: '二级市场资深分析师，擅长行业研究与估值',
      expertiseAreas: ['二级市场', '行业研究', '估值分析'],
      organization: '某券商研究所',
      organizationPublic: true,
      tags: ['研究', '分析', '券商'],
      tokenAccount: {
        create: {
          balance: TOKEN_INITIAL_AMOUNTS.CORE_PARTNER,
          initialAmount: TOKEN_INITIAL_AMOUNTS.CORE_PARTNER,
        },
      },
    },
  });
  console.log(`✅ 创建核心合伙人: ${corePartner.name}`);

  // 创建普通合伙人
  const partnerPassword = await bcrypt.hash('partner123', 10);
  const partner = await prisma.user.upsert({
    where: { email: 'partner@yuanzheng.com' },
    update: {},
    create: {
      email: 'partner@yuanzheng.com',
      phone: '13800000004',
      passwordHash: partnerPassword,
      name: '王合伙',
      gender: '男',
      roleLevel: RoleLevel.PARTNER,
      isAdmin: false,
      joinedAt: new Date('2024-06-01'),
      selfDescription: '专注于新能源领域的项目对接与资源整合',
      expertiseAreas: ['新能源', '项目对接', '资源整合'],
      organization: '某新能源集团',
      organizationPublic: true,
      tags: ['新能源', '项目'],
      tokenAccount: {
        create: {
          balance: TOKEN_INITIAL_AMOUNTS.PARTNER,
          initialAmount: TOKEN_INITIAL_AMOUNTS.PARTNER,
        },
      },
    },
  });
  console.log(`✅ 创建普通合伙人: ${partner.name}`);

  // 创建示例场地
  const venue1 = await prisma.venue.upsert({
    where: { name: '元大投资（北京国贸WWT）' },
    update: {},
    create: {
      name: '元大投资（北京国贸WWT）',
      address: '北京市朝阳区建国门外大街1号国贸大厦 WWT',
      capacity: 30,
      supportsMeal: true,
      note: '可提供午餐和晚餐服务，需提前一天预约',
      status: VenueStatus.ACTIVE,
    },
  });
  console.log(`✅ 创建场地: ${venue1.name}`);

  // ================================
  // 创建示例项目
  // ================================
  
  const project1 = await prisma.project.upsert({
    where: { id: 'proj-demo-1' },
    update: {},
    create: {
      id: 'proj-demo-1',
      name: '某上市公司债务重组项目',
      businessType: BusinessType.DEBT_BUSINESS,
      industry: '金融',
      region: '北京',
      description: '某A股上市公司因经营困难，需要进行债务重组。项目涉及银行债务、供应商应付账款等多类债务的整合与重组。目标是通过引入战略投资者，实现债务化解和业务转型。',
      reviewStatus: ProjectReviewStatus.APPROVED,
      businessStatus: ProjectBusinessStatus.ONGOING,
      visibilityScopeType: VisibilityScopeType.ALL,
      createdById: founder.id,
      members: {
        create: [
          { userId: founder.id, role: 'LEADER', joinedAt: new Date() },
          { userId: corePartner.id, role: 'MEMBER', joinedAt: new Date() },
        ],
      },
    },
  });
  console.log(`✅ 创建项目: ${project1.name}`);

  const project2 = await prisma.project.upsert({
    where: { id: 'proj-demo-2' },
    update: {},
    create: {
      id: 'proj-demo-2',
      name: '新能源产业基金设立',
      businessType: BusinessType.INDUSTRY_ENABLEMENT,
      industry: '新能源',
      region: '上海',
      description: '设立一只专注于新能源领域的产业投资基金，重点投资光伏、储能、新能源汽车等赛道。计划募集规模10亿元，已有多家产业方和金融机构表达意向。',
      reviewStatus: ProjectReviewStatus.APPROVED,
      businessStatus: ProjectBusinessStatus.ONGOING,
      visibilityScopeType: VisibilityScopeType.ALL,
      createdById: founder.id,
      members: {
        create: [
          { userId: founder.id, role: 'LEADER', joinedAt: new Date() },
          { userId: partner.id, role: 'MEMBER', joinedAt: new Date() },
        ],
      },
    },
  });
  console.log(`✅ 创建项目: ${project2.name}`);

  const project3 = await prisma.project.upsert({
    where: { id: 'proj-demo-3' },
    update: {},
    create: {
      id: 'proj-demo-3',
      name: '科创板IPO辅导项目',
      businessType: BusinessType.OTHER,
      industry: '科技',
      region: '深圳',
      description: '某科技公司拟在科创板上市，目前处于辅导期。公司主营业务为半导体设备研发和生产，年营收约5亿元，具有较强的技术壁垒和成长性。',
      reviewStatus: ProjectReviewStatus.APPROVED,
      businessStatus: ProjectBusinessStatus.ONGOING,
      visibilityScopeType: VisibilityScopeType.ALL,
      createdById: corePartner.id,
      members: {
        create: [
          { userId: corePartner.id, role: 'LEADER', joinedAt: new Date() },
        ],
      },
    },
  });
  console.log(`✅ 创建项目: ${project3.name}`);

  const project4 = await prisma.project.upsert({
    where: { id: 'proj-demo-4' },
    update: {},
    create: {
      id: 'proj-demo-4',
      name: '跨境并购 - 欧洲机械制造商',
      businessType: BusinessType.MERGER_ACQUISITION,
      industry: '制造业',
      region: '国际',
      description: '某国内装备制造龙头企业拟收购一家德国精密机械制造商，标的公司年营收约2亿欧元，拥有多项核心专利技术。项目需要寻找合适的财务顾问和并购贷款融资方案。',
      reviewStatus: ProjectReviewStatus.APPROVED,
      businessStatus: ProjectBusinessStatus.ONGOING,
      visibilityScopeType: VisibilityScopeType.ALL,
      createdById: founder.id,
      members: {
        create: [
          { userId: founder.id, role: 'LEADER', joinedAt: new Date() },
          { userId: corePartner.id, role: 'MEMBER', joinedAt: new Date() },
          { userId: partner.id, role: 'MEMBER', joinedAt: new Date() },
        ],
      },
    },
  });
  console.log(`✅ 创建项目: ${project4.name}`);

  // ================================
  // 创建新闻源（用于自动抓取新闻）
  // 使用真实可用的中文新闻 RSS 源
  // ================================

  const newsSource1 = await prisma.newsSource.upsert({
    where: { id: 'ns-ithome' },
    update: { isActive: true },
    create: {
      id: 'ns-ithome',
      name: 'IT之家',
      sourceType: 'RSS',
      baseUrl: 'https://www.ithome.com/rss/',
      fetchInterval: 30,
      defaultTags: ['科技', '互联网', '数码'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource1.name}`);

  const newsSource2 = await prisma.newsSource.upsert({
    where: { id: 'ns-sspai' },
    update: { isActive: true },
    create: {
      id: 'ns-sspai',
      name: '少数派',
      sourceType: 'RSS',
      baseUrl: 'https://sspai.com/feed',
      fetchInterval: 60,
      defaultTags: ['科技', '效率', '数码'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource2.name}`);

  const newsSource3 = await prisma.newsSource.upsert({
    where: { id: 'ns-ifanr' },
    update: { isActive: true },
    create: {
      id: 'ns-ifanr',
      name: '爱范儿',
      sourceType: 'RSS',
      baseUrl: 'https://www.ifanr.com/feed',
      fetchInterval: 30,
      defaultTags: ['科技', '消费电子', '数码'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource3.name}`);

  const newsSource4 = await prisma.newsSource.upsert({
    where: { id: 'ns-huxiu' },
    update: { isActive: true },
    create: {
      id: 'ns-huxiu',
      name: '虎嗅网',
      sourceType: 'RSS',
      baseUrl: 'https://www.huxiu.com/rss/0.xml',
      fetchInterval: 30,
      defaultTags: ['商业', '科技', '观点'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource4.name}`);

  const newsSource5 = await prisma.newsSource.upsert({
    where: { id: 'ns-tmtpost' },
    update: { isActive: true },
    create: {
      id: 'ns-tmtpost',
      name: '钛媒体',
      sourceType: 'RSS',
      baseUrl: 'https://www.tmtpost.com/rss',
      fetchInterval: 30,
      defaultTags: ['科技', '商业', '创投'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource5.name}`);

  const newsSource6 = await prisma.newsSource.upsert({
    where: { id: 'ns-36kr' },
    update: { isActive: true },
    create: {
      id: 'ns-36kr',
      name: '36氪',
      sourceType: 'RSS',
      baseUrl: 'https://36kr.com/feed',
      fetchInterval: 30,
      defaultTags: ['创投', '科技', '商业'],
      isActive: true,
    },
  });
  console.log(`✅ 创建新闻源: ${newsSource6.name}`);

  // ================================
  // 创建示例新闻
  // ================================

  const news1 = await prisma.news.upsert({
    where: { url: 'https://example.com/news/demo-1' },
    update: {},
    create: {
      url: 'https://example.com/news/demo-1',
      title: '央行发布最新货币政策报告：稳健货币政策将更加精准有力',
      summary: '中国人民银行发布2024年第四季度货币政策执行报告，强调将继续实施稳健的货币政策，加大对实体经济的支持力度，保持流动性合理充裕。',
      source: '央行官网',
      industry: 'finance',
      region: 'national',
      tags: ['货币政策', '央行', '金融'],
      publishedAt: new Date(),
      createdById: admin.id,
    },
  });
  console.log(`✅ 创建新闻: ${news1.title.substring(0, 30)}...`);

  const news2 = await prisma.news.upsert({
    where: { url: 'https://example.com/news/demo-2' },
    update: {},
    create: {
      url: 'https://example.com/news/demo-2',
      title: '新能源汽车产销量再创新高，全年有望突破1000万辆',
      summary: '根据中国汽车工业协会最新数据，今年前11个月新能源汽车产销量分别达到920万辆和890万辆，同比增长超过30%。',
      source: '中国汽车工业协会',
      industry: 'tech',
      region: 'national',
      tags: ['新能源', '汽车', '产业'],
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
      createdById: admin.id,
    },
  });
  console.log(`✅ 创建新闻: ${news2.title.substring(0, 30)}...`);

  const news3 = await prisma.news.upsert({
    where: { url: 'https://example.com/news/demo-3' },
    update: {},
    create: {
      url: 'https://example.com/news/demo-3',
      title: '上市公司并购重组活跃度提升，监管支持优质企业资产整合',
      summary: '近期A股市场并购重组案例显著增加，监管层多次表态支持上市公司围绕产业链进行资产整合，推动优质资产注入。',
      source: '证券时报',
      industry: 'finance',
      region: 'national',
      tags: ['并购重组', '上市公司', 'A股'],
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 前天
      createdById: admin.id,
    },
  });
  console.log(`✅ 创建新闻: ${news3.title.substring(0, 30)}...`);

  // 关联新闻到项目
  await prisma.projectNews.upsert({
    where: { projectId_newsId: { projectId: project1.id, newsId: news3.id } },
    update: {},
    create: {
      projectId: project1.id,
      newsId: news3.id,
    },
  });
  console.log(`✅ 关联新闻到项目: ${project1.name}`);

  await prisma.projectNews.upsert({
    where: { projectId_newsId: { projectId: project2.id, newsId: news2.id } },
    update: {},
    create: {
      projectId: project2.id,
      newsId: news2.id,
    },
  });
  console.log(`✅ 关联新闻到项目: ${project2.name}`);

  console.log('\n🎉 种子数据创建完成！');
  console.log('\n📋 测试账号信息:');
  console.log('  管理员: admin@yuanzheng.com / admin123');
  console.log('  联合创始人: founder@yuanzheng.com / founder123');
  console.log('  核心合伙人: core@yuanzheng.com / core123');
  console.log('  普通合伙人: partner@yuanzheng.com / partner123');
  console.log('\n📰 新闻源已配置:');
  console.log('  - IT之家 (RSS)');
  console.log('  - 少数派 (RSS)');
  console.log('  - 爱范儿 (RSS)');
  console.log('  - 虎嗅网 (RSS)');
  console.log('  - 钛媒体 (RSS)');
  console.log('  - 36氪 (RSS)');
  console.log('\n📁 示例项目:');
  console.log('  - 某上市公司债务重组项目');
  console.log('  - 新能源产业基金设立');
  console.log('  - 科创板IPO辅导项目');
  console.log('  - 跨境并购 - 欧洲机械制造商');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

