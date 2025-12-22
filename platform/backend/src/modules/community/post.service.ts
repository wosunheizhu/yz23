/**
 * 社群动态服务 - Node 10
 * PRD 17/6.9: 社群模块
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { ensureHigherRolesIncluded, buildVisibilityFilter } from '../../utils/visibility.js';
import type {
  CreatePostInput,
  UpdatePostInput,
  ListPostsQuery,
  PostResponse,
  PostListResponse,
  CreateCommentInput,
  CommentResponse,
  CommentListResponse,
  PostDetailResponse,
} from './post.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 创建动态
// ================================

/**
 * 发布动态
 * PRD 6.9.1: 社群动态
 */
export const createPost = async (
  input: CreatePostInput,
  userId: string,
  userRoleLevel: number = 1
): Promise<PostResponse> => {
  const {
    content,
    postType,
    relatedObjectType,
    relatedObjectId,
    images,
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds,
    mentionedUserIds,
  } = input;

  // PRD 31.3: CUSTOM 保存时后端强制合并高层用户
  const finalVisibilityUserIds = await ensureHigherRolesIncluded(
    visibilityScopeType || 'ALL',
    userRoleLevel,
    visibilityUserIds || []
  );

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      content,
      images: images || [],
      postType: postType as any,
      relatedObjectType,
      relatedObjectId,
      visibilityScopeType: visibilityScopeType as any,
      visibilityMinRoleLevel,
      visibilityUserIds: finalVisibilityUserIds,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  // 发送 @ 提醒通知
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    await sendNotification({
      eventType: 'COMMUNITY_MENTIONED',
      actorId: userId,
      targetUserIds: mentionedUserIds,
      title: '您在社群动态中被 @ 了',
      content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      relatedObjectType: 'POST',
      relatedObjectId: post.id,
      channels: ['INBOX', 'EMAIL'],
    });
  }

  logger.info({ postId: post.id, userId }, '动态已发布');

  return formatPost(post, userId);
};

// ================================
// 获取动态列表
// ================================

export const listPosts = async (
  query: ListPostsQuery,
  currentUserId: string,
  currentRoleLevel: number
): Promise<PostListResponse> => {
  const { postType, authorId, relatedObjectType, relatedObjectId, page, pageSize } = query;

  const where: Record<string, unknown> = { ...notDeleted };

  // 可见性过滤
  where.OR = [
    { visibilityScopeType: 'ALL' },
    {
      visibilityScopeType: 'ROLE_MIN_LEVEL',
      visibilityMinRoleLevel: { lte: currentRoleLevel },
    },
    {
      visibilityScopeType: 'CUSTOM',
      visibilityUserIds: { has: currentUserId },
    },
    { authorId: currentUserId }, // 自己的动态总是可见
  ];

  if (postType) where.postType = postType;
  if (authorId) where.authorId = authorId;
  if (relatedObjectType) where.relatedObjectType = relatedObjectType;
  if (relatedObjectId) where.relatedObjectId = relatedObjectId;

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: currentUserId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    data: items.map((post) => formatPost(post, currentUserId)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取动态详情
// ================================

export const getPostById = async (
  id: string,
  currentUserId: string
): Promise<PostDetailResponse | null> => {
  const post = await prisma.post.findFirst({
    where: { id, ...notDeleted },
    include: {
      author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
      _count: { select: { comments: true, likes: true } },
      likes: { where: { userId: currentUserId }, select: { id: true } },
      comments: {
        where: notDeleted,
        include: {
          author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  });

  if (!post) return null;

  return {
    ...formatPost(post, currentUserId),
    comments: post.comments.map(formatComment),
  };
};

// ================================
// 更新动态
// ================================

export const updatePost = async (
  id: string,
  input: UpdatePostInput,
  userId: string
): Promise<PostResponse> => {
  const post = await prisma.post.findFirst({
    where: { id, ...notDeleted },
  });

  if (!post) {
    throw new Error('动态不存在');
  }

  if (post.authorId !== userId) {
    throw new Error('只能编辑自己的动态');
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { content: input.content },
    include: {
      author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  return formatPost(updated, userId);
};

// ================================
// 删除动态
// ================================

export const deletePost = async (
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const post = await prisma.post.findFirst({
    where: { id, ...notDeleted },
  });

  if (!post) {
    throw new Error('动态不存在');
  }

  if (post.authorId !== userId && !isAdmin) {
    throw new Error('只能删除自己的动态');
  }

  await prisma.post.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (isAdmin && post.authorId !== userId) {
    await createAuditLog({
      userId,
      action: 'DELETE',
      objectType: 'POST',
      objectId: id,
      summary: '管理员删除社群动态',
    });
  }

  logger.info({ postId: id, userId }, '动态已删除');
};

// ================================
// 点赞
// ================================

export const likePost = async (postId: string, userId: string): Promise<void> => {
  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    throw new Error('已经点赞过了');
  }

  await prisma.like.create({
    data: { postId, userId },
  });
};

export const unlikePost = async (postId: string, userId: string): Promise<void> => {
  await prisma.like.deleteMany({
    where: { postId, userId },
  });
};

// ================================
// 评论
// ================================

export const createComment = async (
  postId: string,
  input: CreateCommentInput,
  userId: string
): Promise<CommentResponse> => {
  const { content, parentId, mentionedUserIds } = input;

  const post = await prisma.post.findFirst({
    where: { id: postId, ...notDeleted },
    include: { author: { select: { id: true } } },
  });

  if (!post) {
    throw new Error('动态不存在');
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: userId,
      content,
      parentId,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
    },
  });

  // 通知动态作者（如果不是自己）
  if (post.author.id !== userId) {
    await sendNotification({
      eventType: 'COMMUNITY_REPLY',
      actorId: userId,
      targetUserIds: [post.author.id],
      title: '您的动态收到了新评论',
      content: content.substring(0, 200),
      relatedObjectType: 'POST',
      relatedObjectId: postId,
      channels: ['INBOX'],
    });
  }

  // 如果是回复某条评论，通知原评论作者
  if (parentId) {
    const parentComment = await prisma.comment.findFirst({
      where: { id: parentId },
      select: { authorId: true },
    });

    if (parentComment && parentComment.authorId !== userId && parentComment.authorId !== post.author.id) {
      await sendNotification({
        eventType: 'COMMENT_REPLIED',
        actorId: userId,
        targetUserIds: [parentComment.authorId],
        title: '您的评论收到了回复',
        content: content.substring(0, 200),
        relatedObjectType: 'POST',
        relatedObjectId: postId,
        channels: ['INBOX'],
      });
    }
  }

  // @ 提醒
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    await sendNotification({
      eventType: 'COMMUNITY_MENTIONED',
      actorId: userId,
      targetUserIds: mentionedUserIds.filter((id) => id !== userId),
      title: '您在评论中被 @ 了',
      content: content.substring(0, 200),
      relatedObjectType: 'POST',
      relatedObjectId: postId,
      channels: ['INBOX', 'EMAIL'],
    });
  }

  return formatComment(comment);
};

export const listComments = async (
  postId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<CommentListResponse> => {
  const where = { postId, ...notDeleted };

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true, roleLevel: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    data: items.map(formatComment),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export const deleteComment = async (
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, ...notDeleted },
  });

  if (!comment) {
    throw new Error('评论不存在');
  }

  if (comment.authorId !== userId && !isAdmin) {
    throw new Error('只能删除自己的评论');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  if (isAdmin && comment.authorId !== userId) {
    await createAuditLog({
      userId,
      action: 'DELETE',
      objectType: 'COMMENT',
      objectId: commentId,
      summary: '管理员删除评论',
    });
  }
};

// ================================
// 辅助函数
// ================================

const formatPost = (post: any, currentUserId: string): PostResponse => ({
  id: post.id,
  authorId: post.authorId,
  authorName: post.author.name,
  authorAvatar: post.author.avatar,
  authorRoleLevel: post.author.roleLevel, // PRD 6.9.1.3: 显示作者角色
  content: post.content,
  images: post.images || [],
  postType: post.postType,
  relatedObjectType: post.relatedObjectType,
  relatedObjectId: post.relatedObjectId,
  visibilityScopeType: post.visibilityScopeType,
  likeCount: post._count?.likes || 0,
  commentCount: post._count?.comments || 0,
  isLikedByMe: post.likes?.length > 0,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

const formatComment = (comment: any): CommentResponse => ({
  id: comment.id,
  postId: comment.postId,
  authorId: comment.authorId,
  authorName: comment.author.name,
  authorAvatar: comment.author.avatar,
  authorRoleLevel: comment.author.roleLevel, // PRD 6.9.1.3: 显示作者角色
  content: comment.content,
  parentId: comment.parentId,
  createdAt: comment.createdAt.toISOString(),
});

