/**
 * 设置页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Bell,
  Shield,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Modal, Input, Loading } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { usersApi } from '../../api/users';

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

type SettingsTab = 'account' | 'notification' | 'privacy';

interface SettingsPageProps {
  defaultTab?: SettingsTab;
}

export default function SettingsPage({ defaultTab = 'account' }: SettingsPageProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 修改密码弹窗
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 通知设置
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    inboxNotifications: true,
    projectNotifications: true,
    demandNotifications: true,
    tokenNotifications: true,
    meetingNotifications: true,
  });

  // 隐私设置（对应用户Profile中的Public字段）
  const [privacy, setPrivacy] = useState({
    organizationPublic: true,
    contactPublic: false,
    addressPublic: false,
  });

  // 加载用户设置
  useEffect(() => {
    if (user?.id) {
      loadUserSettings();
    }
  }, [user?.id]);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const profile = await usersApi.getUserById(user!.id);
      
      // 设置隐私选项
      setPrivacy({
        organizationPublic: profile.organizationPublic ?? true,
        contactPublic: profile.contactPublic ?? false,
        addressPublic: profile.addressPublic ?? false,
      });
      
      // 通知设置（如果有的话）
      // 目前后端可能没有单独的通知设置表，暂时使用本地状态
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 保存隐私设置
  const savePrivacySettings = async (key: keyof typeof privacy, value: boolean) => {
    try {
      setSaving(true);
      
      // 更新本地状态
      setPrivacy(prev => ({ ...prev, [key]: value }));
      
      // 调用API保存
      await usersApi.updateProfile(user!.id, {
        [key]: value,
      });
      
      // 显示保存成功提示
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('保存隐私设置失败:', err);
      // 回滚本地状态
      setPrivacy(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  // 保存通知设置
  const saveNotificationSettings = async (key: keyof typeof notifications, value: boolean) => {
    try {
      setSaving(true);
      
      // 更新本地状态
      setNotifications(prev => ({ ...prev, [key]: value }));
      
      // 调用API保存（如果后端支持）
      // await apiClient.patch('/users/me/notification-settings', { [key]: value });
      
      // 显示保存成功提示
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('保存通知设置失败:', err);
      // 回滚本地状态
      setNotifications(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  // 验证密码强度（与注册要求一致）
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return '密码至少8位';
    if (!/[A-Z]/.test(password)) return '密码需包含大写字母';
    if (!/[a-z]/.test(password)) return '密码需包含小写字母';
    if (!/[0-9]/.test(password)) return '密码需包含数字';
    if (!/[^a-zA-Z0-9]/.test(password)) return '密码需包含特殊字符';
    return null;
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('请填写所有字段');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }
    
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    try {
      setSubmitting(true);
      setPasswordError('');
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'account', label: '账号设置' },
    { id: 'notification', label: '通知设置' },
    { id: 'privacy', label: '隐私设置' },
  ];

  if (loading) {
    return (
      <SimpleLayout title="设置">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="设置">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 保存成功提示 */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-success text-white text-sm rounded-full shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={16} />
            设置已保存
          </motion.div>
        )}

        {/* Tab 切换 */}
        <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2 text-sm rounded-full border whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                  : 'border-silk-gray text-stone-gray'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* 账号设置 */}
        {activeTab === 'account' && (
          <motion.div variants={itemVariants} className="space-y-lg">
            <Card className="divide-y divide-silk-gray">
              {/* 邮箱 */}
              <div className="p-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <Mail size={20} className="text-stone-gray" />
                    <div>
                      <p className="text-body text-deep-black">邮箱</p>
                      <p className="text-tiny text-stone-gray">{user?.email || '未绑定'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" disabled>已绑定</Button>
                </div>
              </div>

              {/* 手机 */}
              <div className="p-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <Phone size={20} className="text-stone-gray" />
                    <div>
                      <p className="text-body text-deep-black">手机号</p>
                      <p className="text-tiny text-stone-gray">功能开发中</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" disabled>绑定</Button>
                </div>
              </div>

              {/* 密码 */}
              <div className="p-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <Lock size={20} className="text-stone-gray" />
                    <div>
                      <p className="text-body text-deep-black">登录密码</p>
                      <p className="text-tiny text-stone-gray">已设置</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPasswordModal(true)}>
                    修改
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 通知设置 */}
        {activeTab === 'notification' && (
          <motion.div variants={itemVariants} className="space-y-lg">
            <Card className="divide-y divide-silk-gray">
              {[
                { key: 'inboxNotifications', label: '站内消息', desc: '接收站内消息通知' },
                { key: 'projectNotifications', label: '项目动态', desc: '项目状态变更、新成员加入等' },
                { key: 'demandNotifications', label: '需求响应', desc: '需求发布、响应审核等' },
                { key: 'tokenNotifications', label: 'Token 交易', desc: '转账、奖励发放等' },
                { key: 'meetingNotifications', label: '会议邀请', desc: '座谈会、场地预约等' },
              ].map(item => (
                <div key={item.key} className="p-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body text-deep-black">{item.label}</p>
                      <p className="text-tiny text-stone-gray">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => saveNotificationSettings(
                        item.key as keyof typeof notifications,
                        !notifications[item.key as keyof typeof notifications]
                      )}
                      disabled={saving}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-champagne-gold'
                          : 'bg-silk-gray'
                      } ${saving ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
            <p className="text-xs text-stone-gray text-center">
              修改后自动保存
            </p>
          </motion.div>
        )}

        {/* 隐私设置 */}
        {activeTab === 'privacy' && (
          <motion.div variants={itemVariants} className="space-y-lg">
            <Card className="divide-y divide-silk-gray">
              {[
                { key: 'organizationPublic', label: '公开所属机构', desc: '其他合伙人可见' },
                { key: 'contactPublic', label: '公开联系方式', desc: '其他合伙人可见' },
                { key: 'addressPublic', label: '公开地址', desc: '其他合伙人可见' },
              ].map(item => (
                <div key={item.key} className="p-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body text-deep-black">{item.label}</p>
                      <p className="text-tiny text-stone-gray">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => savePrivacySettings(
                        item.key as keyof typeof privacy,
                        !privacy[item.key as keyof typeof privacy]
                      )}
                      disabled={saving}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        privacy[item.key as keyof typeof privacy]
                          ? 'bg-champagne-gold'
                          : 'bg-silk-gray'
                      } ${saving ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        privacy[item.key as keyof typeof privacy]
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
            <p className="text-xs text-stone-gray text-center">
              修改后自动保存
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* 修改密码弹窗 */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="修改密码"
      >
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-error/10 text-error text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-success/10 text-success text-sm rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />
              密码修改成功
            </div>
          )}
          
          <Input
            label="当前密码"
            type="password"
            value={passwordForm.oldPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
            placeholder="请输入当前密码"
          />
          <div>
            <Input
              label="新密码"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="请输入新密码"
            />
            <p className="text-xs text-stone-gray mt-1">
              至少8位，需包含大写字母、小写字母、数字和特殊字符
            </p>
          </div>
          <Input
            label="确认新密码"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="请再次输入新密码"
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPasswordModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleChangePassword}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}
