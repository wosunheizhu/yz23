/**
 * AI 服务 - Node 10
 * PRD 6.6.2.2: 项目驱动的关键词推荐
 * PRD 6.6.4: AI 生成新闻摘要
 * 
 * 使用火山方舟 ARK API (豆包大模型)
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

// ================================
// AI 配置 - 火山方舟 ARK API
// ================================

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const getAIConfig = (): AIConfig => ({
  apiKey: config.ark.apiKey,
  baseUrl: config.ark.baseUrl,
  model: config.ark.model,
});

// ================================
// AI 基础调用
// ================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 调用火山方舟 ARK API 聊天接口
 * 文档: https://www.volcengine.com/docs/82379/1099475
 */
export const chat = async (
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> => {
  const aiConfig = getAIConfig();

  if (!aiConfig.apiKey) {
    logger.warn('ARK API Key 未配置，返回模拟响应');
    return mockAIResponse(messages);
  }

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, '火山方舟 ARK API 调用失败');
      // 失败时返回模拟响应，确保功能可用
      return mockAIResponse(messages);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    logger.info({ 
      model: aiConfig.model,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    }, 'ARK API 调用成功');
    
    return content;
  } catch (error) {
    logger.error({ error }, '火山方舟 ARK API 调用异常，使用模拟响应');
    // 出错时返回模拟响应，确保功能可用
    return mockAIResponse(messages);
  }
};

/**
 * 模拟 AI 响应（开发环境或未配置 API Key 时使用）
 */
const mockAIResponse = (messages: ChatMessage[]): string => {
  const lastMessage = messages[messages.length - 1]?.content || '';

  if (lastMessage.includes('新闻') || lastMessage.includes('news')) {
    return '根据您的问题，我整理了以下相关新闻信息：\n\n1. 市场动态持续变化，建议关注相关政策走向。\n2. 行业整合趋势明显，多家企业已启动重组程序。\n3. 监管层面有新的指导意见出台。\n\n如需了解更多细节，请点击相关新闻链接查看原文。';
  }

  if (lastMessage.includes('资源') || lastMessage.includes('resource')) {
    return '根据您的需求，我找到了以下可能匹配的资源：\n\n1. 有多位合伙人在相关领域有丰富经验。\n2. 建议联系具有相关背景的合伙人进行深入沟通。\n3. 可以通过"人脉需求"功能发布您的具体需求。\n\n需要我帮您进一步筛选或联系相关人员吗？';
  }

  if (lastMessage.includes('关键词') || lastMessage.includes('keyword')) {
    return '债务重组, 并购, 交易所, 监管政策, 资产管理, 投资银行';
  }

  if (lastMessage.includes('摘要') || lastMessage.includes('summary')) {
    return '本文主要讨论了当前市场环境下的重要趋势和机遇，对行业参与者具有参考价值。文章从多个维度分析了关键因素，并提出了可行的策略建议。';
  }

  return '感谢您的提问。作为元征平台的 AI 助手，我可以帮助您了解新闻资讯、探索合伙人资源、分析项目相关信息。请告诉我您需要什么帮助？';
};

// ================================
// 新闻 AI 功能
// ================================

/**
 * 生成新闻摘要
 * PRD 6.6.4: AI 可根据网址总结内容和简介
 */
export const generateNewsSummary = async (
  title: string,
  content?: string
): Promise<string> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的新闻编辑助手。请用简洁的中文总结新闻的核心内容，不超过200字。',
    },
    {
      role: 'user',
      content: content
        ? `请为以下新闻生成摘要：\n\n标题：${title}\n\n内容：${content.substring(0, 3000)}`
        : `请为以下新闻标题生成简短摘要：${title}`,
    },
  ];

  return chat(messages, { maxTokens: 300 });
};

/**
 * 生成项目相关的新闻检索关键词
 * PRD 6.6.2.2: AI 生成检索关键词
 */
export const generateNewsKeywords = async (project: {
  name: string;
  businessType: string;
  industry?: string;
  region?: string;
  description?: string;
}): Promise<string[]> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个金融新闻检索专家。根据项目信息，生成5-10个用于检索相关新闻的关键词。只返回关键词列表，用逗号分隔，不要其他解释。',
    },
    {
      role: 'user',
      content: `项目信息：
项目名称：${project.name}
业务类型：${project.businessType}
行业：${project.industry || '未指定'}
地区：${project.region || '未指定'}
描述：${project.description?.substring(0, 500) || '无'}

请生成相关的新闻检索关键词：`,
    },
  ];

  const response = await chat(messages, { maxTokens: 200 });
  return response.split(/[,，]/).map((k) => k.trim()).filter(Boolean);
};

/**
 * 新闻数字人对话
 * PRD 6.6.3: 与数字人对话，了解新闻
 */
export const chatWithNewsAssistant = async (
  userMessage: string,
  context: {
    projectId?: string;
    projectName?: string;
    recentNews?: Array<{ title: string; summary?: string; url: string }>;
  }
): Promise<{
  message: string;
  relatedNewsUrls?: string[];
}> => {
  let systemPrompt = '你是元征合伙人平台的新闻助手。帮助用户理解和分析财经新闻资讯。';

  if (context.projectName) {
    systemPrompt += `\n当前正在查看的项目：${context.projectName}`;
  }

  if (context.recentNews && context.recentNews.length > 0) {
    systemPrompt += '\n\n可参考的新闻列表：\n';
    context.recentNews.slice(0, 5).forEach((news, i) => {
      systemPrompt += `${i + 1}. ${news.title}${news.summary ? ` - ${news.summary}` : ''}\n`;
    });
  }

  systemPrompt += `

回复要求：
1. 用简洁专业的中文回答
2. 如果引用新闻，提供新闻标题
3. 不要直接复制新闻原文，避免版权问题
4. 提供有价值的分析和建议`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await chat(messages, { maxTokens: 800 });

  // 提取引用的新闻 URL
  const relatedNewsUrls = context.recentNews
    ?.filter((news) => response.includes(news.title))
    .map((news) => news.url);

  return {
    message: response,
    relatedNewsUrls,
  };
};

// ================================
// 资源 AI 功能
// ================================

/**
 * 资源探索对话
 * PRD 6.5.5: 资源探索 – 与 AI 数字人对话
 */
export const chatWithResourceAssistant = async (
  userMessage: string,
  context: {
    availableResources?: Array<{
      id: string;
      name: string;
      category: string;
      ownerName: string;
      keywords?: string[];
    }>;
    userRoleLevel: number;
  }
): Promise<{
  message: string;
  recommendedResourceIds?: string[];
}> => {
  let systemPrompt = `你是元征合伙人平台的资源探索助手。帮助用户发现和利用平台上的人脉资源。

用户角色级别：${context.userRoleLevel} (0=合伙人, 1=核心合伙人, 2=联合创始人)

回复要求：
1. 理解用户的资源需求
2. 推荐匹配的资源
3. 提供如何对接的建议
4. 使用简洁专业的中文`;

  if (context.availableResources && context.availableResources.length > 0) {
    systemPrompt += '\n\n可推荐的资源列表：\n';
    context.availableResources.slice(0, 10).forEach((res, i) => {
      systemPrompt += `${i + 1}. [${res.category}] ${res.name} (持有人: ${res.ownerName})\n`;
    });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await chat(messages, { maxTokens: 600 });

  // 提取推荐的资源 ID
  const recommendedResourceIds = context.availableResources
    ?.filter((res) => response.includes(res.name) || response.includes(res.category))
    .map((res) => res.id);

  return {
    message: response,
    recommendedResourceIds,
  };
};

// ================================
// 通用 AI 功能
// ================================

/**
 * 文本分类/标签生成
 */
export const generateTags = async (
  content: string,
  category: 'news' | 'resource' | 'project'
): Promise<string[]> => {
  const categoryPrompts = {
    news: '请为这条财经新闻生成3-5个分类标签（如：并购、重组、监管、IPO等）',
    resource: '请为这个人脉资源生成3-5个专业领域标签',
    project: '请为这个投资项目生成3-5个业务标签',
  };

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的内容分类专家。只返回标签列表，用逗号分隔，不要其他解释。',
    },
    {
      role: 'user',
      content: `${categoryPrompts[category]}：\n\n${content.substring(0, 1000)}`,
    },
  ];

  const response = await chat(messages, { maxTokens: 100 });
  return response.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
};

