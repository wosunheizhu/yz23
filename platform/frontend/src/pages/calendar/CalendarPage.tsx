/**
 * 日历页面
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Users, Video
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty } from '@/components/ui';
import { calendarApi, CalendarEventResponse } from '@/api/calendar';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, isToday,
  startOfWeek, endOfWeek
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const response = await calendarApi.listEvents({
        from: start.toISOString(),
        to: end.toISOString(),
      });
      
      setEvents(response.data || []);
    } catch (error) {
      console.error('加载日历事件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成日历网格
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 获取某天的事件
  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), date));
  };

  // 选中日期的事件
  const selectedDateEvents = getEventsForDay(selectedDate);

  // 事件类型标签
  const getEventTypeBadge = (type: string) => {
    const map: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
      MEETING: { label: '会议', variant: 'primary' },
      BOOKING: { label: '预约', variant: 'success' },
    };
    const info = map[type] || { label: type, variant: 'secondary' as const };
    return <Badge variant={info.variant} size="sm">{info.label}</Badge>;
  };

  return (
    <AppLayout headerTitle="日历" showBottomNav>
      <div className="flex flex-col h-full">
        {/* 月份导航 */}
        <div className="px-4 py-3 bg-pure-white border-b border-silk-gray">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-pearl-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-ink-black" />
            </button>
            <h2 className="text-lg font-medium text-ink-black">
              {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
            </h2>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-pearl-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-ink-black" />
            </button>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-pure-white border-b border-silk-gray">
          {['一', '二', '三', '四', '五', '六', '日'].map(day => (
            <div key={day} className="py-2 text-center text-xs text-stone-gray">
              {day}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="bg-pure-white">
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <motion.button
                  key={index}
                  className={`
                    relative aspect-square flex flex-col items-center justify-start pt-2
                    border-b border-r border-silk-gray
                    ${isCurrentMonth ? 'bg-pure-white' : 'bg-pearl-white'}
                    ${isSelected ? 'bg-ink-black/5' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm
                    ${!isCurrentMonth ? 'text-mist-gray' : 'text-ink-black'}
                    ${isTodayDate ? 'bg-ink-black text-pure-white' : ''}
                    ${isSelected && !isTodayDate ? 'ring-2 ring-ink-black' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* 事件指示点 */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 h-1 rounded-full bg-ink-black"
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 选中日期的事件列表 */}
        <div className="flex-1 overflow-y-auto p-4 bg-pearl-white">
          <h3 className="text-sm font-medium text-ink-black mb-3">
            {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <Loading />
            </div>
          ) : selectedDateEvents.length === 0 ? (
            <div className="text-center text-sm text-stone-gray py-8">
              暂无安排
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {selectedDateEvents.map((event) => (
                  <Card 
                    key={event.id}
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      if (event.eventType === 'MEETING') {
                        navigate(`/meetings/${event.id}`);
                      } else {
                        navigate(`/bookings/${event.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-ink-black flex-1 pr-2 line-clamp-1">
                        {event.title}
                      </h4>
                      {getEventTypeBadge(event.eventType)}
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-gray">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
