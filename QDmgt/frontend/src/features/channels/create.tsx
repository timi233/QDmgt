import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChannelFormData } from '../../types';

// Mock API service - in a real implementation, this would call the backend API
const channelApiService = {
  createChannel: async (channelData: ChannelFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    return {
      id: Math.random().toString(36).substring(2, 9),
      ...channelData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const useChannelCreate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const createChannel = async (channelData: ChannelFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await channelApiService.createChannel(channelData);
      
      // In a real app, you might want to redirect to the newly created channel page
      navigate(`/channels/${result.id}`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建渠道失败';
      setError(errorMessage);
      console.error('Error creating channel:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createChannel,
    loading,
    error
  };
};

// ChannelCreate component
interface ChannelCreateProps {
  onSuccess?: (channel: any) => void;
  onCancel?: () => void;
}

export const ChannelCreate: React.FC<ChannelCreateProps> = ({ onSuccess, onCancel }) => {
  const { createChannel, loading, error } = useChannelCreate();
  
  const handleSubmit = async (data: ChannelFormData) => {
    try {
      const result = await createChannel(data);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      // Error is already handled in the hook
    }
  };

  // This would normally render the ChannelForm component with proper props
  // For now, we'll just return a placeholder
  return (
    <div>
      <h3>创建渠道</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <p>渠道创建表单实现 - 使用ChannelForm组件</p>
      {/* 在实际实现中，这里会渲染ChannelForm组件 */}
    </div>
  );
};

export default ChannelCreate;
