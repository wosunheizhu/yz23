/**
 * 管理员 - 场地管理页面
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, MapPin, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Modal } from '../../components/ui';
import { venuesApi, VenueResponse } from '../../api/venues';

export default function AdminVenuesPage() {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: '', address: '', capacity: 20 });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.list({});
      setVenues(response.data || []);
    } catch (err) {
      console.error('加载场地失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenue = async () => {
    if (!newVenue.name.trim() || !newVenue.address.trim()) {
      alert('请填写完整信息');
      return;
    }
    try {
      setAdding(true);
      await venuesApi.create(newVenue);
      setShowAddModal(false);
      setNewVenue({ name: '', address: '', capacity: 20 });
      loadVenues();
    } catch (err) {
      console.error('创建场地失败:', err);
      alert('创建失败');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (venue: VenueResponse) => {
    try {
      if (venue.status === 'ACTIVE') {
        await venuesApi.disable(venue.id);
      } else {
        await venuesApi.enable(venue.id);
      }
      loadVenues();
    } catch (err) {
      console.error('更新状态失败:', err);
      alert('操作失败');
    }
  };

  return (
    <SimpleLayout title="场地管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 新增场地按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} className="mr-2" />
          新增场地
        </Button>

        {/* 场地列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : venues.length === 0 ? (
          <Empty description="暂无场地" />
        ) : (
          <div className="space-y-md">
            {venues.map((venue) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-deep-black">{venue.name}</h4>
                        <Badge
                          size="sm"
                          className={venue.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
                        >
                          {venue.status === 'ACTIVE' ? '启用' : '禁用'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-stone-gray">
                        <MapPin size={14} />
                        <span>{venue.address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-stone-gray mt-1">
                        <Users size={14} />
                        <span>容纳 {venue.capacity} 人</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(venue)}
                      className="p-2 text-stone-gray hover:text-champagne-gold transition-colors"
                    >
                      {venue.status === 'ACTIVE' ? (
                        <ToggleRight size={24} className="text-success" />
                      ) : (
                        <ToggleLeft size={24} className="text-stone-gray" />
                      )}
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 新增场地弹窗 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增场地"
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm text-stone-gray mb-1">场地名称</label>
            <input
              type="text"
              value={newVenue.name}
              onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
              placeholder="请输入场地名称"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">场地地址</label>
            <input
              type="text"
              value={newVenue.address}
              onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
              placeholder="请输入场地地址"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">容纳人数</label>
            <input
              type="number"
              value={newVenue.capacity}
              onChange={(e) => setNewVenue({ ...newVenue, capacity: Number(e.target.value) })}
              min={1}
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div className="flex gap-3 pt-md">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddVenue} disabled={adding}>
              {adding ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}






