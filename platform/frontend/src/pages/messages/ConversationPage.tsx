/**
 * 私信对话页
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, ArrowLeft } from 'lucide-react';
import { Loading, Avatar } from '@/components/ui';
import { dmApi, MessageResponse } from '@/api/messages';
import { getUserById, UserDetail } from '@/api/users';
import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuthStore } from '@/stores/authStore';

export default function ConversationPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: _currentUser } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [otherUser, setOtherUser] = useState<UserDetail | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (userId) {
      loadOtherUser();
      loadMessages();
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadOtherUser = async () => {
    try {
      const user = await getUserById(userId!);
      setOtherUser(user);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await dmApi.listMessages(userId!);
      // response 是 AxiosResponse，response.data 是 API 响应体
      const apiResponse = response.data as any;
      const messageList = apiResponse?.data?.data || apiResponse?.data || [];
      setMessages(Array.isArray(messageList) ? messageList : []);
      
      // 标记消息为已读
      try {
        await dmApi.markAsRead(userId!);
      } catch (e) {
        // 忽略标记已读失败的错误
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!messageText.trim() || !userId) return;
    
    try {
      setSending(true);
      const response = await dmApi.send({ 
        receiverId: userId,
        content: messageText.trim(),
      });
      
      // 发送成功后，创建一个本地消息对象添加到列表
      const apiResponse = response.data as any;
      const sentMessage = apiResponse?.data || apiResponse;
      if (sentMessage) {
        setMessages(prev => [...prev, { ...sentMessage, isMine: true } as MessageResponse]);
        setMessageText('');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setSending(false);
    }
  };

  const renderDateDivider = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    let label: string;
    if (isSameDay(date, today)) {
      label = '今天';
    } else {
      label = format(date, 'M月d日 EEEE', { locale: zhCN });
    }
    
    return (
      <div className="flex items-center justify-center py-4">
        <span className="px-3 py-1 bg-pearl-white rounded-full text-xs text-stone-gray">
          {label}
        </span>
      </div>
    );
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const current = new Date(messages[index].createdAt);
    const previous = new Date(messages[index - 1].createdAt);
    return !isSameDay(current, previous);
  };

  return (
    <div className="flex flex-col h-screen bg-pearl-white">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-pure-white border-b border-silk-gray">
        <button 
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-pearl-white rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-ink-black" />
        </button>
        
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => otherUser && navigate(`/partners/${otherUser.id}`)}
        >
          <Avatar 
            src={otherUser?.avatarUrl} 
            name={otherUser?.name || '加载中'} 
            size="md" 
          />
          <div>
            <p className="font-medium text-ink-black">{otherUser?.name || '...'}</p>
            <p className="text-xs text-stone-gray">{otherUser?.organization}</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loading size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-stone-gray">开始对话吧</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMe = message.isMine;
              
              return (
                <div key={message.id}>
                  {shouldShowDateDivider(index) && renderDateDivider(message.createdAt)}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    {!isMe && (
                      <Avatar 
                        src={otherUser?.avatarUrl} 
                        name={otherUser?.name || ''} 
                        size="sm"
                        className="mr-2 flex-shrink-0"
                      />
                    )}
                    
                    <div className={`max-w-[70%] ${isMe ? 'order-first mr-2' : ''}`}>
                      <div 
                        className={`
                          px-4 py-2.5 rounded-2xl text-sm
                          ${isMe 
                            ? 'bg-ink-black text-pure-white rounded-br-sm' 
                            : 'bg-pure-white text-ink-black rounded-bl-sm'
                          }
                        `}
                      >
                        {message.content && message.content !== '[图片]' && (
                          <p>{message.content}</p>
                        )}
                        {message.images && message.images.length > 0 && (
                          <div className={`grid gap-1 mt-1 ${message.images.length === 1 ? 'grid-cols-1' : message.images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {message.images.map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt="" 
                                className="rounded-lg max-w-full cursor-pointer"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className={`text-xs text-stone-gray mt-1 ${isMe ? 'text-right' : ''}`}>
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入框 */}
      <div className="bg-pure-white border-t border-silk-gray p-4 flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            className="w-full px-4 py-3 bg-pearl-white rounded-2xl text-sm resize-none focus:outline-none max-h-32"
            placeholder="输入消息..."
            rows={1}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>
        <button
          className="w-11 h-11 bg-ink-black text-pure-white rounded-full flex items-center justify-center disabled:opacity-50 flex-shrink-0"
          disabled={!messageText.trim() || sending}
          onClick={handleSend}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
