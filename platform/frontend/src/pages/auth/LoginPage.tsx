/**
 * 登录页面
 * 元征 · 合伙人赋能平台
 * 
 * 登录方式：账号 + 密码
 */

import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { post } from '../../api/client';

type PageMode = 'login' | 'register';

/**
 * 密码强度检查
 */
const checkPasswordStrength = (password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };
  const passedCount = Object.values(checks).filter(Boolean).length;
  return { checks, passedCount, isValid: passedCount === 5 };
};

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    roleLevel: string;
    isAdmin: boolean;
    needSetPassword: boolean;
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  const [pageMode, setPageMode] = useState<PageMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单数据
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [gender, setGender] = useState<string>('');
  const [organization, setOrganization] = useState('');
  const [roleLevel, setRoleLevel] = useState<'FOUNDER' | 'CORE_PARTNER' | 'PARTNER'>('PARTNER');

  // 获取重定向目标
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // 密码强度
  const passwordStrength = useMemo(() => checkPasswordStrength(newPassword), [newPassword]);

  // 登录提交
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await post<LoginResponse>('/auth/login/password', {
        identifier,
        password,
      });
      
      // 保存登录状态
      login(response.token, {
        ...response.user,
        roleLevel: response.user.roleLevel as 'PARTNER' | 'CORE_PARTNER' | 'FOUNDER',
      });
      
      // 如果需要首次设置密码，跳转设置页面
      if (response.user.needSetPassword) {
        navigate('/set-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '登录失败，请检查账号密码');
    } finally {
      setIsLoading(false);
    }
  };

  // 自助注册提交
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordStrength.isValid) {
      setError('密码不符合要求');
      return;
    }

    // 验证邀请码
    if (inviteCode !== 'yuanzheng1223') {
      setError('邀请码不正确');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await post<LoginResponse>('/auth/register', {
        name: registerName,
        identifier,
        password: newPassword,
        inviteCode,
        gender: gender || undefined,
        organization: organization || undefined,
        roleLevel,
      });
      
      // 保存登录状态
      login(response.token, {
        ...response.user,
        roleLevel: response.user.roleLevel as 'PARTNER' | 'CORE_PARTNER' | 'FOUNDER',
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center px-6 py-12">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-champagne-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-champagne-gold/5 rounded-full blur-2xl" />
      </div>

      {/* 主内容 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl text-ink-black tracking-wider mb-2">
            元征
          </h1>
          <p className="text-stone-gray text-sm tracking-widest">
            合伙人赋能平台
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-pure-white border border-silk-gray rounded-card shadow-card p-8">
          {pageMode === 'login' ? (
            <>
              <h2 className="text-ink-black text-lg font-medium mb-6 text-center">账号登录</h2>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* 错误提示 */}
                {error && (
                  <div className="bg-error/10 border border-error/30 rounded-gallery px-4 py-3 text-error text-sm">
                    {error}
                  </div>
                )}

                {/* 账号输入 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    手机号 / 邮箱
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="请输入手机号或邮箱"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* 密码输入 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* 登录按钮 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-ink-black text-pure-white py-3 rounded-gallery font-medium hover:bg-ink-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                      登录中...
                    </span>
                  ) : (
                    '登 录'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* 自助注册 */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => { setPageMode('login'); setError(null); }}
                  className="text-stone-gray text-sm hover:text-ink-black transition-colors flex items-center gap-2"
                >
                  ← 返回登录
                </button>
                <h2 className="text-ink-black text-xl mt-4">注册账号</h2>
                <p className="text-stone-gray text-xs mt-1">输入邀请码注册成为合伙人</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* 错误提示 */}
                {error && (
                  <div className="bg-error/10 border border-error/30 rounded-gallery px-4 py-3 text-error text-sm">
                    {error}
                  </div>
                )}

                {/* 邀请码 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    邀请码 <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入邀请码"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* 姓名 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    姓名 <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="请输入您的姓名"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* 性别 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    性别
                  </label>
                  <div className="flex gap-3">
                    {['男', '女', '其他'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-gallery text-sm transition-colors ${
                          gender === g
                            ? 'bg-ink-black text-pure-white'
                            : 'bg-gallery-gray border border-silk-gray text-stone-gray hover:border-champagne-gold'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 合伙人级别 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    合伙人级别 <span className="text-error">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'FOUNDER', label: '联合创始人', desc: '初始Token: 100,000' },
                      { value: 'CORE_PARTNER', label: '核心合伙人', desc: '初始Token: 30,000' },
                      { value: 'PARTNER', label: '普通合伙人', desc: '初始Token: 10,000' },
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setRoleLevel(level.value as typeof roleLevel)}
                        className={`w-full py-3 px-4 rounded-gallery text-left transition-colors ${
                          roleLevel === level.value
                            ? 'bg-champagne-gold text-pure-white'
                            : 'bg-gallery-gray border border-silk-gray text-ink-black hover:border-champagne-gold'
                        }`}
                      >
                        <div className="font-medium">{level.label}</div>
                        <div className={`text-xs ${roleLevel === level.value ? 'text-pure-white/80' : 'text-stone-gray'}`}>
                          {level.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 所属组织 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    所属组织
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="请输入您的公司/组织名称"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                  />
                </div>

                {/* 手机号/邮箱 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    手机号 / 邮箱 <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="请输入手机号或邮箱"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* 密码 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                    密码 <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8位以上，包含大小写字母、数字和特殊字符"
                    className="w-full bg-gallery-gray border border-silk-gray rounded-gallery px-4 py-3 text-ink-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                    required
                    minLength={8}
                  />
                  {/* 密码强度提示 */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i <= passwordStrength.passedCount
                                ? passwordStrength.passedCount >= 5
                                  ? 'bg-success'
                                  : passwordStrength.passedCount >= 3
                                  ? 'bg-warning'
                                  : 'bg-error'
                                : 'bg-silk-gray'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className={passwordStrength.checks.minLength ? 'text-success' : 'text-stone-gray'}>
                          {passwordStrength.checks.minLength ? '✓' : '○'} 至少8位字符
                        </p>
                        <p className={passwordStrength.checks.hasUppercase ? 'text-success' : 'text-stone-gray'}>
                          {passwordStrength.checks.hasUppercase ? '✓' : '○'} 包含大写字母
                        </p>
                        <p className={passwordStrength.checks.hasLowercase ? 'text-success' : 'text-stone-gray'}>
                          {passwordStrength.checks.hasLowercase ? '✓' : '○'} 包含小写字母
                        </p>
                        <p className={passwordStrength.checks.hasNumber ? 'text-success' : 'text-stone-gray'}>
                          {passwordStrength.checks.hasNumber ? '✓' : '○'} 包含数字
                        </p>
                        <p className={passwordStrength.checks.hasSpecial ? 'text-success' : 'text-stone-gray'}>
                          {passwordStrength.checks.hasSpecial ? '✓' : '○'} 包含特殊字符
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isLoading || !passwordStrength.isValid || !inviteCode}
                  className="w-full bg-ink-black text-pure-white py-3 rounded-gallery font-medium hover:bg-ink-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                      注册中...
                    </span>
                  ) : (
                    '注 册'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* 底部说明 */}
        <p className="text-center text-stone-gray text-xs mt-8">
          还没有账号？
          <button
            type="button"
            onClick={() => { setPageMode('register'); setError(null); }}
            className="text-champagne-gold hover:underline ml-1"
          >
            使用邀请码注册
          </button>
        </p>
      </motion.div>
    </div>
  );
}
