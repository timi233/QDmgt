import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChannelFormData } from '../../types';

// Mock API service - in a real implementation, this would call the backend API
const channelApiService = {
  getChannelById: async (id: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock response
    return {
      id,
      name: '示例渠道',
      description: '这是一个示例渠道的描述',
      status: 'active' as const,
      businessType: 'high-value' as const,
      contactEmail: 'contact@example.com',
      contactPhone: '+1234567890',
      createdAt: '2025-01-15T10:30:00Z',
      updatedAt: '2025-05-20T14:45:00Z'
    };
  },
  
  updateChannel: async (id: string, channelData: ChannelFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    return {
      id,
      ...channelData,
      createdAt: '2025-01-15T10:30:00Z', // Keep original creation date
      updatedAt: new Date().toISOString(),
    };
  }
};

export const useChannelUpdate = (channelId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const navigate = useNavigate();
  
  // Load channel if channelId is provided
  const loadChannel = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await channelApiService.getChannelById(id);
      setChannel(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载渠道信息失败';
      setError(errorMessage);
      console.error('Error loading channel:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update channel
  const updateChannel = async (channelData: ChannelFormData) => {
    if (!channelId) {
      setError('未指定渠道ID');
      throw new Error('未指定渠道ID');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await channelApiService.updateChannel(channelId, channelData);
      
      // In a real app, you might want to redirect to the updated channel page
      navigate(`/channels/${result.id}`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新渠道失败';
      setError(errorMessage);
      console.error('Error updating channel:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    channel,
    loading,
    error,
    loadChannel,
    updateChannel
  };
};

// ChannelUpdate component
interface ChannelUpdateProps {
  channelId?: string;
  onSuccess?: (channel: any) => void;
  onCancel?: () => void;
}

export const ChannelUpdate: React.FC<ChannelUpdateProps> = ({ channelId: propChannelId, onSuccess, onCancel }) => {
  const { channel, loading, error, updateChannel, loadChannel } = useChannelUpdate(propChannelId);
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use prop channelId if provided, otherwise use URL param
  const effectiveChannelId = propChannelId || params.id;
  
  // Load channel on component mount if we have an ID
  useEffect(() => {
    if (effectiveChannelId) {
      loadChannel(effectiveChannelId);
    }
  }, [effectiveChannelId]);

  const handleSubmit = async (data: ChannelFormData) => {
    try {
      const result = await updateChannel(data);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      // Error is already handled in the hook
    }
  };

  if (loading && !channel) {
    return <div>加载渠道信息中...</div>;
  }

  if (error && !channel) {
    return <div className="alert alert-danger">{error}</div>;
  }

  // This would normally render the ChannelForm component with the loaded channel data
  return (
    <div>
      <h3>更新渠道</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <p>渠道更新表单实现 - 使用ChannelForm组件和已加载的数据</p>
      {/* 在实际实现中，这里会渲染带有所加载数据的ChannelForm组件 */}
    </div>
  );
};

export default ChannelUpdate;
