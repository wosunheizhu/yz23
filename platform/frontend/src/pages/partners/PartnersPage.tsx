/**
 * 合伙人名录页面
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.5: 合伙人名录（目录页）
 * 白色风格设计
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Loading, Empty, Badge, Avatar } from '../../components/ui';
import { usersApi } from '../../api';
import type { UserListItem, ListUsersParams } from '../../api/users';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function PartnersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string>('');

  // 加载擅长领域列表
  useEffect(() => {
    usersApi.getExpertiseAreas().then(setExpertiseAreas).catch(() => {});
  }, []);

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const params: ListUsersParams = {
          search: search || undefined,
          roleLevel: roleFilter || undefined,
          expertiseArea: selectedExpertise || undefined,
          pageSize: 50,
        };
        const response = await usersApi.listUsers(params);
        setUsers(response.data || []);
        setTotal(response.pagination?.total || 0);
      } catch (error) {
        console.error('加载用户列表失败', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [search, roleFilter, selectedExpertise]);

  const getRoleBadgeVariant = (roleLevel: string): 'default' | 'gold' | 'info' => {
    switch (roleLevel) {
      case 'FOUNDER':
        return 'gold';
      case 'CORE_PARTNER':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (roleLevel: string) => {
    switch (roleLevel) {
      case 'FOUNDER':
        return '联合创始人';
      case 'CORE_PARTNER':
        return '核心合伙人';
      default:
        return '合伙人';
    }
  };

  return (
    <SimpleLayout title="合伙人名录">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 搜索和筛选 */}
        <motion.div variants={itemVariants} className="space-y-md">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-gray" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名、机构、关键词..."
              className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-12 pr-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>

          {/* 筛选标签 */}
          <div className="flex gap-2 overflow-x-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
            >
              <option value="">全部级别</option>
              <option value="FOUNDER">联合创始人</option>
              <option value="CORE_PARTNER">核心合伙人</option>
              <option value="PARTNER">普通合伙人</option>
            </select>

            {expertiseAreas.length > 0 && (
              <select
                value={selectedExpertise}
                onChange={(e) => setSelectedExpertise(e.target.value)}
                className="bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
              >
                <option value="">全部领域</option>
                {expertiseAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            )}
          </div>
        </motion.div>

        {/* 统计 */}
        <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm text-stone-gray">
          <Users size={16} />
          <span>共 {total} 位合伙人</span>
        </motion.div>

        {/* 用户列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-xl">
            <Loading size="lg" />
          </div>
        ) : users.length === 0 ? (
          <Empty description="暂无符合条件的合伙人" />
        ) : (
          <motion.div variants={containerVariants} className="space-y-sm">
            {users.map((user) => (
              <motion.div key={user.id} variants={itemVariants}>
                <Link to={`/partners/${user.id}`}>
                  <Card interactive className="p-md">
                    <div className="flex items-start gap-md">
                      {/* 头像 */}
                      <Avatar
                        src={user.avatarUrl}
                        name={user.name}
                        size="lg"
                      />

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-body font-medium text-deep-black truncate">
                            {user.name}
                          </h3>
                          <Badge size="sm" variant={getRoleBadgeVariant(user.roleLevel)}>
                            {getRoleLabel(user.roleLevel)}
                          </Badge>
                          {user.isAdmin && (
                            <Badge size="sm" variant="error">管理员</Badge>
                          )}
                        </div>

                        {user.organization && (
                          <p className="text-caption text-stone-gray mb-1 truncate">
                            {user.organization}
                          </p>
                        )}

                        {user.selfDescription && (
                          <p className="text-caption text-charcoal line-clamp-2">
                            {user.selfDescription}
                          </p>
                        )}

                        {/* 标签 */}
                        {user.tags && user.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-tiny px-2 py-0.5 bg-gallery-gray text-stone-gray rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {user.tags.length > 3 && (
                              <span className="text-tiny text-stone-gray">
                                +{user.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </SimpleLayout>
  );
}
