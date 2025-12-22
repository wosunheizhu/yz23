/**
 * 全局搜索页面
 * 支持搜索用户、项目、需求
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Users,
  Briefcase,
  FileText,
  ChevronRight,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Card, Badge, Avatar, Loading, Empty } from '../../components/ui';
import { usersApi, UserListItem } from '../../api/users';
import { projectsApi, ProjectListItem } from '../../api/projects';
import { demandsApi, DemandListItem } from '../../api/demands';

type SearchCategory = 'all' | 'users' | 'projects' | 'demands';

interface SearchResult {
  type: 'user' | 'project' | 'demand';
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  avatar?: string;
}

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  all: '全部',
  users: '用户',
  projects: '项目',
  demands: '需求',
};

const CATEGORY_ICONS: Record<SearchCategory, React.ReactNode> = {
  all: null,
  users: <Users size={16} />,
  projects: <Briefcase size={16} />,
  demands: <FileText size={16} />,
};

// 搜索历史
const getSearchHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('searchHistory') || '[]');
  } catch {
    return [];
  }
};

const addToHistory = (query: string) => {
  const history = getSearchHistory().filter((h) => h !== query);
  history.unshift(query);
  localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 10)));
};

const clearHistory = () => {
  localStorage.removeItem('searchHistory');
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>(getSearchHistory());

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // 页面加载时自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 搜索函数
  const performSearch = useCallback(async (searchQuery: string, cat: SearchCategory) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const allResults: SearchResult[] = [];

      // 并行搜索各分类
      const searchPromises: Promise<void>[] = [];

      if (cat === 'all' || cat === 'users') {
        searchPromises.push(
          usersApi.listUsers({ search: searchQuery, pageSize: 10 }).then((res) => {
            (res.data || []).forEach((user: UserListItem) => {
              allResults.push({
                type: 'user',
                id: user.id,
                title: user.name,
                subtitle: user.organization || user.email || '',
                badge: user.roleLevel,
                avatar: user.avatar || undefined,
              });
            });
          }).catch(console.error)
        );
      }

      if (cat === 'all' || cat === 'projects') {
        searchPromises.push(
          projectsApi.listProjects({ search: searchQuery, pageSize: 10 }).then((res) => {
            (res.data || []).forEach((project: ProjectListItem) => {
              allResults.push({
                type: 'project',
                id: project.id,
                title: project.name,
                subtitle: project.industry || project.businessType,
                badge: project.businessStatus,
              });
            });
          }).catch(console.error)
        );
      }

      if (cat === 'all' || cat === 'demands') {
        searchPromises.push(
          demandsApi.listDemands({ search: searchQuery, pageSize: 10 }).then((res) => {
            (res.data || []).forEach((demand: DemandListItem) => {
              allResults.push({
                type: 'demand',
                id: demand.id,
                title: demand.name,
                subtitle: demand.projectName || demand.demandType,
                badge: demand.status,
              });
            });
          }).catch(console.error)
        );
      }

      await Promise.all(searchPromises);
      setResults(allResults);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 输入时防抖搜索
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        performSearch(query, category);
        addToHistory(query);
        setHistory(getSearchHistory());
        setSearchParams({ q: query });
      }, 300);
    } else {
      setResults([]);
      setSearchParams({});
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, category, performSearch, setSearchParams]);

  // 点击历史记录
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  // 清除搜索
  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // 点击结果
  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        navigate(`/partners/${result.id}`);
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'demand':
        navigate(`/demands/${result.id}`);
        break;
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users size={14} className="text-info" />;
      case 'project':
        return <Briefcase size={14} className="text-success" />;
      case 'demand':
        return <FileText size={14} className="text-warning" />;
      default:
        return null;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return '用户';
      case 'project':
        return '项目';
      case 'demand':
        return '需求';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-off-white">
      {/* 搜索头部 */}
      <div className="sticky top-0 z-10 bg-pure-white border-b border-silk-gray">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-stone-gray hover:text-ink-black transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索用户、项目、需求..."
              className="w-full pl-10 pr-10 py-2.5 bg-gallery-gray rounded-lg text-sm placeholder:text-stone-gray focus:outline-none focus:ring-1 focus:ring-champagne-gold"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-gray hover:text-ink-black"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          {(Object.keys(CATEGORY_LABELS) as SearchCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-ink-black text-white'
                  : 'bg-gallery-gray text-stone-gray hover:bg-silk-gray'
              }`}
            >
              {CATEGORY_ICONS[cat]}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {/* 加载状态 */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <Loading size="lg" />
            </motion.div>
          )}

          {/* 搜索结果 */}
          {!loading && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {results.map((result) => (
                <Card
                  key={`${result.type}-${result.id}`}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center gap-3">
                    {result.avatar ? (
                      <Avatar name={result.title} src={result.avatar} size="md" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gallery-gray flex items-center justify-center">
                        {getTypeIcon(result.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-ink-black truncate">{result.title}</span>
                        <Badge size="xs" variant="secondary">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-gray truncate">{result.subtitle}</p>
                    </div>
                    <ChevronRight size={18} className="text-stone-gray shrink-0" />
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {/* 无结果 */}
          {!loading && query && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Empty description={`未找到与"${query}"相关的结果`} />
            </motion.div>
          )}

          {/* 搜索历史 */}
          {!loading && !query && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-ink-black">搜索历史</h3>
                <button
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                  className="text-xs text-stone-gray hover:text-ink-black"
                >
                  清除
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.filter(Boolean).map((h, idx) => (
                  <button
                    key={`history-${idx}-${h}`}
                    onClick={() => handleHistoryClick(h)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gallery-gray rounded-full text-sm text-stone-gray hover:bg-silk-gray transition-colors"
                  >
                    <Clock size={14} />
                    {h}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* 空状态提示 */}
          {!loading && !query && history.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search size={48} className="mx-auto mb-4 text-stone-gray opacity-30" />
              <p className="text-stone-gray">输入关键词开始搜索</p>
              <p className="text-sm text-stone-gray mt-1">
                支持搜索用户、项目、需求
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

