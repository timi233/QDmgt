import { useState, useEffect } from 'react';
import ChannelList from '../../components/ChannelList';
import { Channel } from '../../types'; // Assuming we have a types file

// Mock API service - in a real implementation, this would call the backend API
const channelApiService = {
  getChannels: async (params?: { 
    search?: string; 
    status?: string; 
    businessType?: string;
    skip?: number;
    limit?: number;
  }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock response
    const mockChannels: Channel[] = [
      {
        id: '1',
        name: '基本盘渠道-1',
        description: '主要客户渠道',
        status: 'active',
        business_type: 'basic',
        contact_email: 'contact1@example.com',
        contact_phone: '+1234567890',
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-05-20T14:45:00Z',
        created_by: 'system',
        last_modified_by: 'system'
      },
      {
        id: '2',
        name: '高价值渠道-1',
        description: '战略合作伙伴',
        status: 'active',
        business_type: 'high-value',
        contact_email: 'contact2@example.com',
        contact_phone: '+0987654321',
        created_at: '2025-02-20T09:15:00Z',
        updated_at: '2025-06-10T11:30:00Z',
        created_by: 'system',
        last_modified_by: 'system'
      },
      {
        id: '3',
        name: '待签约渠道-1',
        description: '潜在合作伙伴',
        status: 'inactive',
        business_type: 'pending-signup',
        contact_email: 'contact3@example.com',
        contact_phone: '+1122334455',
        created_at: '2025-03-05T13:20:00Z',
        created_by: 'system',
        last_modified_by: 'system'
      },
      {
        id: '4',
        name: '基本盘渠道-2',
        description: '维护客户渠道',
        status: 'suspended',
        business_type: 'basic',
        contact_email: 'contact4@example.com',
        contact_phone: '+5544332211',
        created_at: '2025-01-30T08:45:00Z',
        updated_at: '2025-04-15T16:20:00Z',
        created_by: 'system',
        last_modified_by: 'system'
      }
    ];
    
    return {
      data: mockChannels,
      pagination: {
        page: params?.skip || 0,
        limit: params?.limit || 10,
        total: mockChannels.length,
        pages: Math.ceil(mockChannels.length / (params?.limit || 10))
      }
    };
  }
};

export const useChannelList = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 10, total: 0, pages: 0 });

  const loadChannels = async (params?: { 
    search?: string; 
    status?: string; 
    businessType?: string;
    skip?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await channelApiService.getChannels(params);
      setChannels(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载渠道列表失败';
      setError(errorMessage);
      console.error('Error loading channels:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load channels on initial render
  useEffect(() => {
    loadChannels();
  }, []);

  return {
    channels,
    loading,
    error,
    pagination,
    loadChannels
  };
};

// ChannelListPage component
interface ChannelListPageProps {
  onChannelSelect?: (channel: Channel) => void;
  onChannelEdit?: (channel: Channel) => void;
  onTargetPlanning?: (channelId: string) => void;
}

export const ChannelListPage: React.FC<ChannelListPageProps> = ({ 
  onChannelSelect, 
  onChannelEdit, 
  onTargetPlanning 
}) => {
  const { channels, loading, error, loadChannels } = useChannelList();

  // Handler functions
  const handleViewChannel = (channel: Channel) => {
    if (onChannelSelect) {
      onChannelSelect(channel);
    }
  };

  const handleEditChannel = (channel: Channel) => {
    if (onChannelEdit) {
      onChannelEdit(channel);
    }
  };

  const handleTargetPlanning = (channelId: string) => {
    if (onTargetPlanning) {
      onTargetPlanning(channelId);
    }
  };

  return (
    <div>
      <h3>渠道列表</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <ChannelList 
        onEdit={handleEditChannel}
        onView={handleViewChannel}
        onTargetPlanning={handleTargetPlanning}
      />
    </div>
  );
};

export default ChannelListPage;
