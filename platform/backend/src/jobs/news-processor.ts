/**
 * 新闻源爬取后台任务 - Node 10
 * PRD 6.6.5: 新闻源配置与自动爬取
 * 使用AI大模型进行智能新闻关联
 */

import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { batchAnalyzeNewsRelevance } from '../utils/ai.js';

// ================================
// 配置
// ================================

const PROCESS_INTERVAL = 5 * 60 * 1000; // 5分钟检查一次
const MAX_NEWS_PER_FETCH = 50; // 每次最多抓取的新闻条数

let processorInterval: NodeJS.Timeout | null = null;

// ================================
// RSS 解析
// ================================

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

/**
 * 解析 RSS Feed
 */
const parseRSSFeed = async (url: string): Promise<RSSItem[]> => {
  try {
    logger.info({ url }, '开始抓取 RSS Feed');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YuanzhengBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    
    if (!response.ok) {
      logger.error({ url, status: response.status }, 'RSS 请求失败');
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const text = await response.text();
    const items: RSSItem[] = [];
    
    logger.debug({ url, contentLength: text.length }, 'RSS 内容获取成功');
    
    // 简单的 RSS 解析
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i;
    const linkRegex = /<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/i;
    const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i;
    
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const itemText = match[1];
      
      // 修复：使用 titleRegex 而不是 itemRegex
      const titleMatch = titleRegex.exec(itemText);
      const linkMatch = linkRegex.exec(itemText);
      
      if (linkMatch && linkMatch[1]) {
        const title = titleMatch ? (titleMatch[1] || '').trim() : '';
        const pubDateMatch = pubDateRegex.exec(itemText);
        const descMatch = descRegex.exec(itemText);
        
        if (title) {
          items.push({
            title: title,
            link: linkMatch[1].trim(),
            pubDate: pubDateMatch ? pubDateMatch[1] : undefined,
            description: descMatch ? (descMatch[1] || '').trim().substring(0, 500) : undefined,
          });
        }
      }
    }
    
    logger.info({ url, itemCount: items.length }, 'RSS 解析完成');
    return items.slice(0, MAX_NEWS_PER_FETCH);
  } catch (error) {
    logger.error({ error, url }, 'RSS 解析失败');
    return [];
  }
};

/**
 * 解析 Atom Feed
 */
const parseAtomFeed = async (url: string): Promise<RSSItem[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const text = await response.text();
    const items: RSSItem[] = [];
    
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    const titleRegex = /<title[^>]*>(.*?)<\/title>/i;
    const linkRegex = /<link[^>]*href=["'](.*?)["'][^>]*>/i;
    const updatedRegex = /<updated>(.*?)<\/updated>/i;
    const summaryRegex = /<summary[^>]*>(.*?)<\/summary>/i;
    
    let match;
    while ((match = entryRegex.exec(text)) !== null) {
      const entryText = match[1];
      
      const titleMatch = titleRegex.exec(entryText);
      const linkMatch = linkRegex.exec(entryText);
      
      if (linkMatch) {
        const updatedMatch = updatedRegex.exec(entryText);
        const summaryMatch = summaryRegex.exec(entryText);
        
        items.push({
          title: titleMatch ? titleMatch[1].trim() : '',
          link: linkMatch[1].trim(),
          pubDate: updatedMatch ? updatedMatch[1] : undefined,
          description: summaryMatch ? summaryMatch[1].trim() : undefined,
        });
      }
    }
    
    return items.slice(0, MAX_NEWS_PER_FETCH);
  } catch (error) {
    logger.error({ error, url }, 'Atom 解析失败');
    return [];
  }
};

// ================================
// 新闻源抓取
// ================================

/**
 * 抓取单个新闻源
 */
const fetchNewsSource = async (source: {
  id: string;
  name: string;
  sourceType: string;
  baseUrl: string;
  defaultTags: string[];
}): Promise<number> => {
  let items: RSSItem[] = [];
  
  try {
    switch (source.sourceType) {
      case 'RSS':
        items = await parseRSSFeed(source.baseUrl);
        break;
      case 'ATOM':
        items = await parseAtomFeed(source.baseUrl);
        break;
      case 'API':
        // API 类型需要根据具体 API 格式实现
        logger.info({ sourceId: source.id }, 'API 类型新闻源暂不支持自动抓取');
        return 0;
      case 'HTML':
        // HTML 类型需要根据解析规则实现
        logger.info({ sourceId: source.id }, 'HTML 类型新闻源暂不支持自动抓取');
        return 0;
      default:
        logger.warn({ sourceId: source.id, sourceType: source.sourceType }, '未知的新闻源类型');
        return 0;
    }
    
    if (items.length === 0) {
      return 0;
    }
    
    // 批量插入新闻（URL 作为去重键）
    let insertedCount = 0;
    
    for (const item of items) {
      if (!item.link || !item.title) continue;
      
      try {
        // 检查是否已存在
        const existing = await prisma.news.findUnique({
          where: { url: item.link },
        });
        
        if (!existing) {
          await prisma.news.create({
            data: {
              url: item.link,
              title: item.title,
              summary: item.description?.substring(0, 500) || null,
              source: source.name,
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
              tags: source.defaultTags,
            },
          });
          insertedCount++;
        }
      } catch (error) {
        // 忽略单条新闻的插入错误（可能是重复）
        logger.debug({ error, url: item.link }, '新闻插入失败');
      }
    }
    
    return insertedCount;
  } catch (error) {
    logger.error({ error, sourceId: source.id }, '新闻源抓取失败');
    return 0;
  }
};

/**
 * 处理所有需要抓取的新闻源
 * PRD 6.6.5: 定时任务按频率抓取每个有效源
 */
const processNewsSources = async (): Promise<void> => {
  try {
    // 获取所有激活的新闻源
    const sources = await prisma.newsSource.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sourceType: true,
        baseUrl: true,
        fetchInterval: true,
        defaultTags: true,
        updatedAt: true,
      },
    });
    
    if (sources.length === 0) {
      return;
    }
    
    const now = new Date();
    let totalInserted = 0;
    
    for (const source of sources) {
      // 检查是否到了抓取时间（基于 fetchInterval 和 updatedAt）
      const lastFetch = source.updatedAt;
      const intervalMs = source.fetchInterval * 60 * 1000; // 转换为毫秒
      const nextFetchTime = new Date(lastFetch.getTime() + intervalMs);
      
      if (now < nextFetchTime) {
        // 还没到抓取时间
        continue;
      }
      
      logger.info({ sourceId: source.id, name: source.name }, '开始抓取新闻源');
      
      const insertedCount = await fetchNewsSource(source);
      totalInserted += insertedCount;
      
      // 更新 updatedAt 以记录抓取时间
      await prisma.newsSource.update({
        where: { id: source.id },
        data: { updatedAt: now },
      });
      
      logger.info({ sourceId: source.id, insertedCount }, '新闻源抓取完成');
    }
    
    if (totalInserted > 0) {
      logger.info({ totalInserted }, '本次新闻抓取完成');
      
      // 自动关联新闻到项目
      const linkedCount = await autoLinkNewsToProjects();
      logger.info({ linkedCount }, '新闻自动关联完成');
    }
  } catch (error) {
    logger.error({ error }, '新闻处理任务执行失败');
  }
};

// ================================
// 启动/停止处理器
// ================================

/**
 * 启动新闻处理器
 */
export const startNewsProcessor = (): void => {
  if (processorInterval) {
    logger.warn('新闻处理器已在运行');
    return;
  }
  
  logger.info({ interval: PROCESS_INTERVAL }, '启动新闻处理器');
  
  // 延迟一分钟后开始第一次执行（避免服务启动时立即执行）
  setTimeout(() => {
    processNewsSources();
  }, 60 * 1000);
  
  // 定时执行
  processorInterval = setInterval(processNewsSources, PROCESS_INTERVAL);
};

/**
 * 停止新闻处理器
 */
export const stopNewsProcessor = (): void => {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    logger.info('新闻处理器已停止');
  }
};

/**
 * 手动触发抓取（用于管理员操作）
 */
export const triggerNewsFetch = async (sourceId?: string): Promise<{
  success: boolean;
  insertedCount: number;
  linkedCount: number;
}> => {
  try {
    let insertedCount = 0;
    
    if (sourceId) {
      // 抓取指定新闻源
      const source = await prisma.newsSource.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          name: true,
          sourceType: true,
          baseUrl: true,
          defaultTags: true,
        },
      });
      
      if (!source) {
        return { success: false, insertedCount: 0, linkedCount: 0 };
      }
      
      insertedCount = await fetchNewsSource(source);
      
      await prisma.newsSource.update({
        where: { id: sourceId },
        data: { updatedAt: new Date() },
      });
    } else {
      // 抓取所有
      await processNewsSources();
      insertedCount = -1; // -1 表示批量
    }
    
    // 抓取后自动关联新闻到项目
    const linkedCount = await autoLinkNewsToProjects();
    
    return { success: true, insertedCount, linkedCount };
  } catch (error) {
    logger.error({ error, sourceId }, '手动触发抓取失败');
    return { success: false, insertedCount: 0, linkedCount: 0 };
  }
};

// ================================
// 自动关联新闻到项目
// ================================

/**
 * 项目关键词配置
 * 根据项目的业务类型和行业自动生成关键词
 */
const getProjectKeywords = (project: {
  name: string;
  businessType: string;
  industry: string | null;
  description: string | null;
}): string[] => {
  const keywords: string[] = [];
  
  // 根据业务类型添加关键词（扩展更多相关词）
  const businessTypeKeywords: Record<string, string[]> = {
    'DEBT_BUSINESS': ['债务', '重组', '破产', '债转股', '不良资产', '债务危机', '债权', '清算', '偿债'],
    'MERGER_ACQUISITION': ['并购', '收购', '合并', '重组', '资产整合', '股权转让', '控股', '兼并'],
    'INDUSTRY_ENABLEMENT': ['产业基金', '产业投资', '产业园', '产业链', '基金设立', '投资基金'],
    'EQUITY_INVESTMENT': ['股权投资', '融资', '私募', 'PE', 'VC', '投资', 'IPO', '上市', '风投'],
    'OTHER': ['投资', '融资', '商业'],
  };
  
  if (businessTypeKeywords[project.businessType]) {
    keywords.push(...businessTypeKeywords[project.businessType]);
  }
  
  // 根据行业添加关键词（扩展更多相关词，包含常见变体）
  const industryKeywords: Record<string, string[]> = {
    '金融': ['金融', '银行', '保险', '证券', '基金', '投资', '资本', '货币', '央行', '利率', '股票', '理财', '贷款', '存款'],
    '新能源': ['新能源', '电动车', '电动汽车', '锂电', '光伏', '风电', '储能', '充电', '电池', '碳中和', '绿色能源', '特斯拉', '比亚迪'],
    '科技': ['科技', '互联网', '人工智能', 'AI', '芯片', '半导体', '软件', '数字化', '智能', '算法', '大模型', '技术', '科学', '量子', '数据', '云计算', '5G', '手机', '电脑', '创新', 'App', '应用', '平台', '系统', '程序', '代码', '开发'],
    '制造业': ['制造', '工业', '装备', '机械', '生产', '工厂', '自动化'],
    '医疗': ['医疗', '医药', '生物', '健康', '医院', '药品', '疫苗'],
    '房地产': ['房地产', '地产', '楼市', '住宅', '商业地产', '房价'],
    '消费': ['消费', '零售', '电商', '品牌', '购物', '市场'],
    '汽车': ['汽车', '车企', '车型', '销量', '新车', '电动车', '智驾', '驾车', '车主'],
    '1': ['投资', '融资', '商业'], // 默认行业
  };
  
  if (project.industry && industryKeywords[project.industry]) {
    keywords.push(...industryKeywords[project.industry]);
  }
  
  // 从项目名称提取关键词（简单分词）
  const nameKeywords = project.name
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
  keywords.push(...nameKeywords);
  
  // 去重
  return [...new Set(keywords)];
};

/**
 * 自动将新闻关联到相关项目
 * 使用AI大模型进行智能分析
 */
export const autoLinkNewsToProjects = async (): Promise<number> => {
  try {
    logger.info('开始AI智能关联新闻到项目...');
    
    // 获取所有活跃项目
    const projects = await prisma.project.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, businessType: true, industry: true, description: true },
    });
    
    logger.info({ projectCount: projects.length }, '找到项目');
    
    if (projects.length === 0) {
      return 0;
    }
    
    // 获取最近24小时内未关联的新闻
    const recentTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unlinkedNews = await prisma.news.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: recentTime },
        projects: { none: {} }, // 未关联任何项目
      },
      select: { id: true, title: true, summary: true },
    });
    
    logger.info({ unlinkedCount: unlinkedNews.length, since: recentTime.toISOString() }, '找到未关联新闻');
    
    if (unlinkedNews.length === 0) {
      logger.info('没有需要关联的新闻');
      return 0;
    }
    
    let linkedCount = 0;
    
    // 分批处理（每批最多10条，避免AI请求过大）
    const batchSize = 10;
    for (let i = 0; i < unlinkedNews.length; i += batchSize) {
      const batch = unlinkedNews.slice(i, i + batchSize);
      
      logger.info({ batch: Math.floor(i / batchSize) + 1, newsCount: batch.length }, '开始AI分析批次');
      
      try {
        // 调用AI分析
        const relevanceMap = await batchAnalyzeNewsRelevance(batch, projects);
        
        // 创建关联
        for (const [newsId, projectIds] of relevanceMap) {
          for (const projectId of projectIds) {
            try {
              const existing = await prisma.projectNews.findFirst({
                where: { newsId, projectId },
              });
              
              if (!existing) {
                await prisma.projectNews.create({
                  data: { newsId, projectId },
                });
                
                const news = batch.find(n => n.id === newsId);
                const project = projects.find(p => p.id === projectId);
                logger.info({ 
                  newsTitle: news?.title.substring(0, 30), 
                  projectName: project?.name,
                }, 'AI关联新闻到项目');
                linkedCount++;
              }
            } catch (e) {
              // 忽略重复关联错误
            }
          }
        }
      } catch (error) {
        logger.error({ error, batch: Math.floor(i / batchSize) + 1 }, 'AI分析批次失败，使用关键词回退');
        // AI失败时，使用简单关键词匹配作为回退
        linkedCount += await fallbackKeywordMatch(batch, projects);
      }
      
      // 添加短暂延迟，避免API请求过快
      if (i + batchSize < unlinkedNews.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.info({ linkedCount }, 'AI智能关联完成');
    return linkedCount;
  } catch (error) {
    logger.error({ error }, 'AI关联新闻失败');
    return 0;
  }
};

/**
 * 关键词匹配回退（当AI不可用时）
 */
const fallbackKeywordMatch = async (
  newsList: Array<{ id: string; title: string; summary?: string | null }>,
  projects: Array<{ id: string; name: string; businessType: string; industry: string | null; description: string | null }>
): Promise<number> => {
  let linkedCount = 0;
  
  for (const news of newsList) {
    for (const project of projects) {
      const keywords = getProjectKeywords(project);
      const titleLower = news.title.toLowerCase();
      
      const matched = keywords.some(kw => titleLower.includes(kw.toLowerCase()));
      
      if (matched) {
        try {
          const existing = await prisma.projectNews.findFirst({
            where: { newsId: news.id, projectId: project.id },
          });
          
          if (!existing) {
            await prisma.projectNews.create({
              data: { newsId: news.id, projectId: project.id },
            });
            linkedCount++;
          }
        } catch (e) {
          // 忽略
        }
        break;
      }
    }
  }
  
  return linkedCount;
};

/**
 * 为特定项目抓取相关新闻
 * 用于新项目创建时
 */
export const fetchNewsForProject = async (projectId: string): Promise<{
  fetchedCount: number;
  linkedCount: number;
}> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, businessType: true, industry: true, description: true },
    });
    
    if (!project) {
      return { fetchedCount: 0, linkedCount: 0 };
    }
    
    const keywords = getProjectKeywords(project);
    logger.info({ projectId, keywords }, '为项目搜索相关新闻');
    
    // 从现有新闻中搜索并关联
    let linkedCount = 0;
    
    for (const keyword of keywords.slice(0, 5)) { // 最多使用前5个关键词
      const matchingNews = await prisma.news.findMany({
        where: {
          isDeleted: false,
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { summary: { contains: keyword, mode: 'insensitive' } },
          ],
          projects: { none: { projectId } }, // 未关联到此项目
        },
        take: 10,
      });
      
      for (const news of matchingNews) {
        try {
          await prisma.projectNews.create({
            data: { newsId: news.id, projectId },
          });
          linkedCount++;
        } catch (e) {
          // 忽略重复
        }
      }
    }
    
    logger.info({ projectId, linkedCount }, '项目新闻关联完成');
    return { fetchedCount: 0, linkedCount };
  } catch (error) {
    logger.error({ error, projectId }, '为项目抓取新闻失败');
    return { fetchedCount: 0, linkedCount: 0 };
  }
};

