/**
 * AI 服务 - 火山方舟/豆包大模型
 * 用于新闻分析、项目关联等智能功能
 */

import { config } from '../config/index.js';
import { logger } from './logger.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ArkResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用火山方舟API
 */
export const callArkAPI = async (
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> => {
  const { apiKey, baseUrl, model } = config.ark;
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'AI API 调用失败');
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json() as ArkResponse;
    const content = data.choices?.[0]?.message?.content || '';
    
    logger.debug({ 
      tokens: data.usage?.total_tokens,
      model: data.model,
    }, 'AI API 调用成功');
    
    return content;
  } catch (error) {
    logger.error({ error }, 'AI API 调用异常');
    throw error;
  }
};

/**
 * 分析新闻与项目的相关性
 * 返回最相关的项目ID列表
 */
export const analyzeNewsProjectRelevance = async (
  news: {
    title: string;
    summary?: string | null;
  },
  projects: Array<{
    id: string;
    name: string;
    businessType: string;
    industry: string | null;
    description: string | null;
  }>
): Promise<string[]> => {
  if (projects.length === 0) return [];
  
  // 构建项目列表描述
  const projectList = projects.map((p, i) => 
    `${i + 1}. ID:${p.id} | 名称:${p.name} | 业务:${p.businessType} | 行业:${p.industry || '通用'}`
  ).join('\n');
  
  const prompt = `你是一个新闻分析助手。请分析以下新闻与项目的相关性。

【新闻标题】
${news.title}

【新闻摘要】
${news.summary || '无'}

【项目列表】
${projectList}

【任务】
请判断这条新闻与哪些项目相关。相关性判断标准：
- 新闻主题与项目业务类型相关（如：债务重组、并购、新能源、科技等）
- 新闻涉及的行业与项目行业相符
- 新闻内容对项目有参考价值

【输出格式】
只输出相关项目的ID，用逗号分隔。如果没有相关项目，输出 "无"。
示例输出：proj-demo-1,proj-demo-2
或：无

请直接输出结果，不要解释：`;

  try {
    const response = await callArkAPI([
      { role: 'user', content: prompt }
    ], { temperature: 0.1, maxTokens: 200 });
    
    const result = response.trim();
    
    if (result === '无' || result === 'none' || result === '') {
      return [];
    }
    
    // 解析返回的项目ID
    const projectIds = result
      .split(/[,，\s]+/)
      .map(id => id.trim())
      .filter(id => projects.some(p => p.id === id));
    
    logger.info({ 
      newsTitle: news.title.substring(0, 30),
      matchedProjects: projectIds,
    }, 'AI 新闻关联分析完成');
    
    return projectIds;
  } catch (error) {
    logger.error({ error, newsTitle: news.title }, 'AI 分析新闻相关性失败');
    return [];
  }
};

/**
 * 批量分析新闻与项目的相关性
 * 为了节省API调用，一次分析多条新闻
 */
export const batchAnalyzeNewsRelevance = async (
  newsList: Array<{
    id: string;
    title: string;
    summary?: string | null;
  }>,
  projects: Array<{
    id: string;
    name: string;
    businessType: string;
    industry: string | null;
    description: string | null;
  }>
): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();
  
  if (newsList.length === 0 || projects.length === 0) {
    return result;
  }
  
  // 构建新闻列表
  const newsDescriptions = newsList.map((n, i) => 
    `[${i + 1}] ID:${n.id}\n标题: ${n.title}\n摘要: ${n.summary?.substring(0, 100) || '无'}`
  ).join('\n\n');
  
  // 构建项目列表
  const projectList = projects.map(p => 
    `- ${p.id}: ${p.name} (${p.businessType}, ${p.industry || '通用'})`
  ).join('\n');
  
  const prompt = `你是一个新闻分析助手。请分析以下新闻分别与哪些项目相关。

【项目列表】
${projectList}

【新闻列表】
${newsDescriptions}

【任务】
对每条新闻，判断它与哪些项目相关。相关性标准：
- 新闻主题与项目业务类型相关
- 新闻涉及的行业与项目行业相符
- 新闻对项目有参考价值

【输出格式】
每行一条新闻的结果，格式为：新闻ID:项目ID1,项目ID2
如果新闻与任何项目都不相关，输出：新闻ID:无

示例：
news-1:proj-demo-1,proj-demo-2
news-2:无
news-3:proj-demo-3

请直接输出结果，每行一条，不要有其他内容：`;

  try {
    const response = await callArkAPI([
      { role: 'user', content: prompt }
    ], { temperature: 0.1, maxTokens: 1000 });
    
    // 解析响应
    const lines = response.trim().split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):(.+)$/);
      if (match) {
        const newsId = match[1].trim();
        const projectIdsStr = match[2].trim();
        
        if (projectIdsStr !== '无' && projectIdsStr !== 'none') {
          const projectIds = projectIdsStr
            .split(/[,，]/)
            .map(id => id.trim())
            .filter(id => projects.some(p => p.id === id));
          
          if (projectIds.length > 0) {
            result.set(newsId, projectIds);
          }
        }
      }
    }
    
    logger.info({ 
      newsCount: newsList.length,
      matchedCount: result.size,
    }, 'AI 批量新闻关联分析完成');
    
    return result;
  } catch (error) {
    logger.error({ error }, 'AI 批量分析失败');
    return result;
  }
};

/**
 * 生成新闻摘要
 */
export const generateNewsSummary = async (
  title: string,
  content?: string
): Promise<string> => {
  const prompt = `请为以下新闻生成一个简洁的摘要（50-100字）：

标题：${title}
${content ? `内容：${content.substring(0, 2000)}` : ''}

请直接输出摘要，不要有其他内容：`;

  try {
    const response = await callArkAPI([
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 200 });
    
    return response.trim();
  } catch (error) {
    logger.error({ error, title }, '生成新闻摘要失败');
    return '';
  }
};



