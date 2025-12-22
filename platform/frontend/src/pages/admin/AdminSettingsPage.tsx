/**
 * 管理员 - 系统设置页面
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Key } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading } from '../../components/ui';
import { adminApi } from '../../api/admin';

// 系统配置
interface SystemConfig {
  selfRegistrationInviteCode: string;
}

const defaultConfig: SystemConfig = {
  selfRegistrationInviteCode: '',
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSystemConfig();
      setConfig({
        selfRegistrationInviteCode: response.selfRegistrationInviteCode || '',
      });
    } catch (err) {
      console.error('加载配置失败:', err);
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (config.selfRegistrationInviteCode.length < 4) {
      alert('邀请码至少需要4位');
      return;
    }
    
    try {
      setSaving(true);
      await adminApi.updateSystemConfig({
        selfRegistrationInviteCode: config.selfRegistrationInviteCode,
      });
      alert('设置已保存');
    } catch (err: any) {
      console.error('保存配置失败:', err);
      alert(err.response?.data?.error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout title="系统设置" showBack backPath="/admin">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="系统设置" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 邀请码配置 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-lg">
            <div className="flex items-center gap-2 mb-lg">
              <Key size={20} className="text-champagne-gold" />
              <h3 className="font-medium text-deep-black">注册邀请码</h3>
            </div>
            <div className="space-y-md">
              <div>
                <label className="block text-sm text-stone-gray mb-1">当前邀请码</label>
                <input
                  type="text"
                  value={config.selfRegistrationInviteCode}
                  onChange={(e) => setConfig({ ...config, selfRegistrationInviteCode: e.target.value })}
                  placeholder="请输入邀请码（至少4位）"
                  className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
                />
                <p className="text-xs text-stone-gray mt-1">
                  用户注册时需要输入此邀请码才能完成注册
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 操作按钮 */}
        <div className="pt-md">
          <Button variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-1" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </SimpleLayout>
  );
}
