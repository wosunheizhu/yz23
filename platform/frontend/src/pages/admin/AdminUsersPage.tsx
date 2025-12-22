/**
 * 管理员 - 用户管理页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Edit, Trash2, UserPlus } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Avatar, Modal } from '../../components/ui';
import { usersApi, UserListItem } from '../../api/users';

const ROLE_LABELS: Record<string, string> = {
  PARTNER: '普通合伙人',
  CORE_PARTNER: '核心合伙人',
  FOUNDER: '联合创始人',
};

const ROLE_COLORS: Record<string, string> = {
  PARTNER: 'bg-gallery-gray text-stone-gray',
  CORE_PARTNER: 'bg-champagne-gold/10 text-champagne-gold',
  FOUNDER: 'bg-champagne-gold/20 text-champagne-gold',
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  
  // 新增用户模态框
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    roleLevel: 'PARTNER',
    password: '',
  });
  const [adding, setAdding] = useState(false);
  
  // 编辑用户级别模态框
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editRoleLevel, setEditRoleLevel] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // 删除用户确认
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const params: any = { pageSize: 50 };
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await usersApi.listUsers(params);
      setUsers(response.data || []);
    } catch (err) {
      console.error('加载用户失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    const timer = setTimeout(() => {
      loadUsers(value);
    }, 300);
    setSearchTimer(timer);
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert('请填写姓名、邮箱和密码');
      return;
    }
    try {
      setAdding(true);
      await usersApi.createUser({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || undefined,
        organization: newUser.organization || undefined,
        roleLevel: newUser.roleLevel as any,
        password: newUser.password,
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', organization: '', roleLevel: 'PARTNER', password: '' });
      loadUsers();
    } catch (err: any) {
      console.error('创建用户失败:', err);
      // 处理 Zod 验证错误（可能在 details 中）
      const errorData = err.response?.data?.error;
      let message = errorData?.message || '创建失败';
      if (errorData?.details) {
        // 如果有详细错误信息，提取并显示
        const details = errorData.details;
        if (typeof details === 'object') {
          const detailMessages = Object.values(details).filter(Boolean).join('；');
          if (detailMessages) message = detailMessages;
        }
      }
      alert(message);
    } finally {
      setAdding(false);
    }
  };

  // 打开编辑用户模态框
  const handleOpenEdit = (user: UserListItem) => {
    setEditingUser(user);
    setEditRoleLevel(user.roleLevel);
    setEditIsAdmin(user.isAdmin);
    setShowEditModal(true);
  };

  // 更新用户级别
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      setUpdating(true);
      await usersApi.adminUpdateUser(editingUser.id, {
        roleLevel: editRoleLevel as any,
        isAdmin: editIsAdmin,
      });
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('更新用户失败:', err);
      alert(err.response?.data?.error?.message || '更新失败');
    } finally {
      setUpdating(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    try {
      setDeleting(true);
      await usersApi.deleteUser(deletingUser.id);
      setShowDeleteModal(false);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('删除用户失败:', err);
      alert(err.response?.data?.error?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 打开删除确认
  const handleOpenDelete = (user: UserListItem) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  return (
    <SimpleLayout title="用户管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 搜索框 */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索用户姓名、组织..."
            className="w-full pl-12 pr-4 py-3 bg-pure-white border border-silk-gray rounded-gallery text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 新增用户按钮 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={18} className="mr-2" />
          新增用户
        </Button>

        {/* 用户列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : users.length === 0 ? (
          <Empty description="暂无用户" />
        ) : (
          <div className="space-y-md">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-center gap-md">
                    <Avatar name={user.name} src={user.avatar || undefined} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-deep-black">{user.name}</h4>
                        {user.isAdmin && (
                          <Badge size="sm" variant="new">管理员</Badge>
                        )}
                      </div>
                      <p className="text-sm text-stone-gray truncate">{user.organization || '-'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge size="sm" className={ROLE_COLORS[user.roleLevel] || 'bg-gallery-gray text-stone-gray'}>
                          {ROLE_LABELS[user.roleLevel] || user.roleLevel}
                        </Badge>
                        <span className="text-xs text-stone-gray">
                          Token: {user.tokenBalance?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 text-stone-gray hover:text-champagne-gold transition-colors"
                        title="编辑用户"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(user)}
                        className="p-2 text-stone-gray hover:text-error transition-colors"
                        title="删除用户"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => navigate(`/partners/${user.id}`)}
                        className="p-2 text-stone-gray hover:text-champagne-gold transition-colors"
                        title="查看详情"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 新增用户模态框 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增用户"
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm text-stone-gray mb-1">姓名 *</label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="请输入姓名"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">邮箱 *</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="请输入邮箱"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">密码 *</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="请输入密码（至少6位）"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
            <p className="text-xs text-stone-gray mt-1">密码至少6位</p>
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">手机号</label>
            <input
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">组织</label>
            <input
              type="text"
              value={newUser.organization}
              onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })}
              placeholder="请输入组织"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">角色</label>
            <select
              value={newUser.roleLevel}
              onChange={(e) => setNewUser({ ...newUser, roleLevel: e.target.value })}
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            >
              <option value="PARTNER">普通合伙人</option>
              <option value="CORE_PARTNER">核心合伙人</option>
              <option value="FOUNDER">联合创始人</option>
            </select>
          </div>
          <div className="flex gap-3 pt-md">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddUser} disabled={adding}>
              {adding ? '创建中...' : '创建用户'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`编辑用户 - ${editingUser?.name || ''}`}
      >
        <div className="space-y-md">
          {/* 当前信息 */}
          <div className="bg-gallery-gray p-4 rounded-gallery">
            <p className="text-sm text-stone-gray mb-1">当前用户</p>
            <p className="font-medium text-deep-black">{editingUser?.name}</p>
            <p className="text-xs text-stone-gray">{editingUser?.email || editingUser?.phone}</p>
          </div>

          {/* 合伙人级别 */}
          <div>
            <label className="block text-sm text-stone-gray mb-2">合伙人级别</label>
            <div className="space-y-2">
              {[
                { value: 'FOUNDER', label: '联合创始人', desc: 'Token额度: 100,000' },
                { value: 'CORE_PARTNER', label: '核心合伙人', desc: 'Token额度: 30,000' },
                { value: 'PARTNER', label: '普通合伙人', desc: 'Token额度: 10,000' },
              ].map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setEditRoleLevel(level.value)}
                  className={`w-full py-3 px-4 rounded-gallery text-left transition-colors ${
                    editRoleLevel === level.value
                      ? 'bg-champagne-gold text-pure-white'
                      : 'bg-gallery-gray border border-silk-gray text-ink-black hover:border-champagne-gold'
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className={`text-xs ${editRoleLevel === level.value ? 'text-pure-white/80' : 'text-stone-gray'}`}>
                    {level.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 管理员权限 */}
          <div>
            <button
              type="button"
              onClick={() => setEditIsAdmin(!editIsAdmin)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                editIsAdmin 
                  ? 'bg-champagne-gold border-champagne-gold' 
                  : 'bg-white border-silk-gray hover:border-champagne-gold'
              }`}>
                {editIsAdmin && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-deep-black">设为管理员</span>
            </button>
            <p className="text-xs text-stone-gray mt-1 ml-8">管理员可以管理用户、审核项目等</p>
          </div>

          <div className="flex gap-3 pt-md">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleUpdateUser} disabled={updating}>
              {updating ? '更新中...' : '保存更改'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除用户"
      >
        <div className="space-y-md">
          <div className="bg-error/10 p-4 rounded-gallery text-center">
            <p className="text-sm text-error mb-2">⚠️ 此操作不可撤销</p>
            <p className="font-medium text-deep-black">{deletingUser?.name}</p>
            <p className="text-xs text-stone-gray">{deletingUser?.email || deletingUser?.phone}</p>
          </div>
          <p className="text-sm text-stone-gray text-center">
            删除后，该用户将无法登录系统，其数据将被标记为已删除。
          </p>
          <div className="flex gap-3 pt-md">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 bg-error hover:bg-error/90" 
              onClick={handleDeleteUser} 
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}

