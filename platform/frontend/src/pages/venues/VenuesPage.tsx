/**
 * 场地列表页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, Utensils, Check, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Button } from '@/components/ui';
import { venuesApi, VenueResponse } from '@/api/venues';

export default function VenuesPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.listVenues({ status: 'ACTIVE' });
      if (response.success && response.data) {
        setVenues(response.data.items);
      }
    } catch (error) {
      console.error('加载场地列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
      ACTIVE: { label: '可用', variant: 'success' },
      MAINTENANCE: { label: '维护中', variant: 'secondary' },
      DISABLED: { label: '已停用', variant: 'secondary' },
    };
    const info = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="场地列表" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false} headerTitle="场地列表" showBack>
      <div className="p-4">
        {venues.length === 0 ? (
          <Empty description="暂无可用场地" />
        ) : (
          <div className="space-y-3">
            {venues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-4 cursor-pointer hover:bg-pearl-white transition-colors"
                  onClick={() => navigate(`/bookings/create?venueId=${venue.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-ink-black mb-1">{venue.name}</h3>
                      {venue.address && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-gray">
                          <MapPin className="w-3 h-3" />
                          <span>{venue.address}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(venue.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-gray">
                    {venue.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>容纳 {venue.capacity} 人</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Utensils className="w-3 h-3" />
                      <span>{venue.supportsMeal ? '支持用餐' : '不支持用餐'}</span>
                    </div>
                  </div>

                  {venue.note && (
                    <p className="mt-2 text-xs text-stone-gray line-clamp-2">
                      {venue.note}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}






