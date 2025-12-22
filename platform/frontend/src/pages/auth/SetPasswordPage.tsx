/**
 * 首次设置密码页面
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.3: 管理员创建账号后首次登录需设置密码
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { post } from '../../api/client';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 密码强度检查
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const isMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('密码不符合要求');
      return;
    }
    
    if (!isMatch) {
      setError('两次密码输入不一致');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await post('/auth/set-password', {
        password,
        confirmPassword,
      });
      
      // 更新用户状态
      if (user) {
        setUser({ ...user, needSetPassword: false });
      }
      
      // 跳转到仪表盘
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '设置密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-black flex flex-col items-center justify-center px-6 py-12">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-champagne-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-champagne-gold/3 rounded-full blur-2xl" />
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
          <h1 className="font-display text-4xl md:text-5xl text-pure-white tracking-wider mb-2">
            元征
          </h1>
          <p className="text-stone-gray text-sm tracking-widest">
            设置您的密码
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-ink-black/50 backdrop-blur-sm border border-charcoal/50 rounded-gallery p-8">
          <div className="mb-6">
            <h2 className="text-pure-white text-xl mb-2">首次登录设置密码</h2>
            <p className="text-stone-gray text-sm">
              欢迎 {user?.name}！请设置您的登录密码。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded-gallery px-4 py-3 text-error text-sm">
                {error}
              </div>
            )}

            {/* 密码输入 */}
            <div>
              <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                设置密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full bg-deep-black border border-charcoal rounded-gallery px-4 py-3 text-pure-white placeholder:text-charcoal focus:border-champagne-gold focus:outline-none transition-colors"
                required
              />
            </div>

            {/* 密码强度提示 */}
            <div className="space-y-2">
              <p className="text-stone-gray text-xs">密码要求：</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={passwordChecks.length ? 'text-success' : 'text-charcoal'}>
                  ✓ 至少8位字符
                </div>
                <div className={passwordChecks.uppercase ? 'text-success' : 'text-charcoal'}>
                  ✓ 包含大写字母
                </div>
                <div className={passwordChecks.lowercase ? 'text-success' : 'text-charcoal'}>
                  ✓ 包含小写字母
                </div>
                <div className={passwordChecks.number ? 'text-success' : 'text-charcoal'}>
                  ✓ 包含数字
                </div>
                <div className={passwordChecks.special ? 'text-success' : 'text-charcoal'}>
                  ✓ 包含特殊字符
                </div>
              </div>
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-stone-gray text-xs mb-2 tracking-wider">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className={`w-full bg-deep-black border rounded-gallery px-4 py-3 text-pure-white placeholder:text-charcoal focus:outline-none transition-colors ${
                  confirmPassword
                    ? isMatch
                      ? 'border-success'
                      : 'border-error'
                    : 'border-charcoal focus:border-champagne-gold'
                }`}
                required
              />
              {confirmPassword && !isMatch && (
                <p className="text-error text-xs mt-1">两次密码输入不一致</p>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !isMatch}
              className="w-full bg-champagne-gold text-deep-black py-3 rounded-gallery font-medium hover:bg-champagne-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-deep-black border-t-transparent rounded-full animate-spin" />
                  设置中...
                </span>
              ) : (
                '完成设置'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}






