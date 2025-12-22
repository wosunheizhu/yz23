/**
 * 人脉资源详情页面
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Building,
  MapPin,
  Briefcase,
  Phone,
  Star,
  Edit,
  Trash2,
  Share2,
  Link,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Avatar } from '../../components/ui';
import {
  getNetworkResource,
  getResourceLinks,
  deleteNetworkResource,
  NetworkResource,
  ResourceLinks,
  RESOURCE_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
  CONTACT_STATUS_LABELS,
} from '../../api/network-resources';
import { useAuthStore } from '../../stores/authStore';

// 联系状态颜色映射
const contactStatusColors: Record<string, string> = {
  PENDING: 'bg-gallery-gray text-stone-gray',
  CONTACTED: 'bg-info/10 text-info',
  SUCCEEDED: 'bg-success/10 text-success',
  FAILED: 'bg-error/10 text-error',
};

export default function NetworkResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<NetworkResource | null>(null);
  const [links, setLinks] = useState<ResourceLinks | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadResource(id);
    }
  }, [id]);

  const loadResource = async (resourceId: string) => {
    try {
      setLoading(true);
      const [resourceData, linksData] = await Promise.all([
        getNetworkResource(resourceId),
        getResourceLinks(resourceId).catch(() => null),
      ]);
      setResource(resourceData);
      setLinks(linksData);
    } catch (err) {
      console.error('Failed to load resource:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('确定要删除这条人脉资源吗？')) return;
    
    try {
      setDeleting(true);
      await deleteNetworkResource(id);
      navigate('/network-resources', { replace: true });
    } catch (err) {
      console.error('Failed to delete resource:', err);
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = resource?.createdByUserId === user?.id;

  if (loading) {
    return (
      <SimpleLayout title="人脉详情">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!resource) {
    return (
      <SimpleLayout title="人脉详情">
        <Empty description="资源不存在" />
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout
      title="人脉详情"
      rightActions={
        isOwner ? (
          <div className="flex items-center gap-sm">
            <button
              onClick={() => navigate(`/network-resources/${id}/edit`)}
              className="p-2 text-stone-gray hover:text-champagne-gold"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-stone-gray hover:text-error"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 基本信息卡片 */}
        <Card className="p-xl">
          <div className="flex items-start gap-lg mb-lg">
            <div className="w-16 h-16 rounded-full bg-gallery-gray flex items-center justify-center">
              {resource.resourceType === 'PERSON' ? (
                <Users size={32} className="text-stone-gray" />
              ) : (
                <Building size={32} className="text-stone-gray" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-sm mb-xs">
                <h2 className="font-serif-cn text-title text-deep-black">
                  {resource.name || resource.organization || '未命名'}
                </h2>
                <Badge size="sm">{RESOURCE_TYPE_LABELS[resource.resourceType]}</Badge>
              </div>
              {(resource.organization || resource.title) && (
                <p className="text-body text-stone-gray">
                  {resource.organization && resource.title
                    ? `${resource.organization} · ${resource.title}`
                    : resource.organization || resource.title}
                </p>
              )}
            </div>
          </div>

          {/* 状态和关系强度 */}
          <div className="flex items-center gap-lg mb-lg">
            <Badge className={contactStatusColors[resource.contactStatus]}>
              {CONTACT_STATUS_LABELS[resource.contactStatus]}
            </Badge>
            <div className="flex items-center gap-xs">
              <span className="text-tiny text-stone-gray mr-xs">关系强度</span>
              {[1, 2, 3, 4, 5].map((level) => (
                <Star
                  key={level}
                  size={16}
                  className={level <= resource.relationshipStrength ? 'text-champagne-gold fill-champagne-gold' : 'text-silk-gray'}
                />
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="w-full h-px bg-silk-gray mb-lg" />

          {/* 详细信息 */}
          <div className="space-y-md">
            {resource.industryTags.length > 0 && (
              <div className="flex items-start gap-md">
                <Briefcase size={16} className="text-stone-gray mt-0.5" />
                <div className="flex flex-wrap gap-xs">
                  {resource.industryTags.map((tag, idx) => (
                    <Badge key={idx} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {resource.region && (
              <div className="flex items-center gap-md">
                <MapPin size={16} className="text-stone-gray" />
                <span className="text-body text-deep-black">{resource.region}</span>
              </div>
            )}

            {resource.contact && (
              <div className="flex items-center gap-md">
                <Phone size={16} className="text-stone-gray" />
                <span className="text-body text-deep-black">{resource.contact}</span>
              </div>
            )}

            {resource.relationshipDesc && (
              <div className="mt-md pt-md border-t border-silk-gray">
                <p className="text-tiny text-stone-gray mb-xs">关系描述</p>
                <p className="text-body text-deep-black">{resource.relationshipDesc}</p>
              </div>
            )}

            {resource.note && (
              <div className="mt-md pt-md border-t border-silk-gray">
                <p className="text-tiny text-stone-gray mb-xs">备注</p>
                <p className="text-body text-deep-black">{resource.note}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 关联对象 */}
        {links && (links.projects.length > 0 || links.demands.length > 0 || links.meetings.length > 0) && (
          <Card className="p-lg">
            <h3 className="section-title mb-md">关联对象</h3>
            
            {links.projects.length > 0 && (
              <div className="mb-md">
                <p className="text-tiny text-stone-gray mb-sm">关联项目</p>
                <div className="space-y-sm">
                  {links.projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="w-full flex items-center justify-between p-sm bg-gallery-gray rounded-gallery hover:bg-silk-gray transition-colors"
                    >
                      <span className="text-body text-deep-black">{project.name}</span>
                      <ChevronRight size={16} className="text-stone-gray" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {links.demands.length > 0 && (
              <div className="mb-md">
                <p className="text-tiny text-stone-gray mb-sm">关联需求</p>
                <div className="space-y-sm">
                  {links.demands.map((demand) => (
                    <button
                      key={demand.id}
                      onClick={() => navigate(`/demands/${demand.id}`)}
                      className="w-full flex items-center justify-between p-sm bg-gallery-gray rounded-gallery hover:bg-silk-gray transition-colors"
                    >
                      <span className="text-body text-deep-black">{demand.name}</span>
                      <ChevronRight size={16} className="text-stone-gray" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {links.meetings.length > 0 && (
              <div>
                <p className="text-tiny text-stone-gray mb-sm">关联会议</p>
                <div className="space-y-sm">
                  {links.meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                      className="w-full flex items-center justify-between p-sm bg-gallery-gray rounded-gallery hover:bg-silk-gray transition-colors"
                    >
                      <span className="text-body text-deep-black">{meeting.topic}</span>
                      <ChevronRight size={16} className="text-stone-gray" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 引荐按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={() => navigate(`/network-resources/${id}/referral`)}
        >
          <Share2 size={16} className="mr-2" />
          引荐此资源
        </Button>

        {/* 创建信息 */}
        <div className="text-center">
          <p className="text-tiny text-stone-gray">
            由 {resource.createdByUserName || '未知'} 创建于{' '}
            {new Date(resource.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </motion.div>
    </SimpleLayout>
  );
}






