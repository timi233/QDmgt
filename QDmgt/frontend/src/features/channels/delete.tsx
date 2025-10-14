import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock API service - in a real implementation, this would call the backend API
const channelApiService = {
  deleteChannel: async (id: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    return { success: true, message: '渠道删除成功' };
  }
};

export const useChannelDelete = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const deleteChannel = async (channelId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await channelApiService.deleteChannel(channelId);
      
      // In a real app, you might want to redirect to the channels list page
      navigate('/channels');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除渠道失败';
      setError(errorMessage);
      console.error('Error deleting channel:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteChannel,
    loading,
    error
  };
};

// Confirmation dialog component for channel deletion
interface ConfirmDeleteModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelName?: string;
  loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  show, 
  onClose, 
  onConfirm, 
  channelName,
  loading = false
}) => {
  if (!show) return null;

  return (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">确认删除</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>您确定要删除渠道 <strong>{channelName}</strong> 吗？此操作无法撤销。</p>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? '删除中...' : '删除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChannelDelete component
interface ChannelDeleteProps {
  channelId: string;
  channelName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ChannelDelete: React.FC<ChannelDeleteProps> = ({ 
  channelId, 
  channelName, 
  onSuccess, 
  onCancel 
}) => {
  const { deleteChannel, loading, error } = useChannelDelete();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteChannel(channelId);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error is already handled in the hook
    }
  };

  const handleConfirmDelete = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    handleDelete();
    setShowConfirm(false);
  };

  const handleClose = () => {
    setShowConfirm(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div>
      <button 
        className="btn btn-danger" 
        onClick={handleConfirmDelete}
        disabled={loading}
      >
        {loading ? '删除中...' : '删除渠道'}
      </button>
      
      {error && <div className="alert alert-danger mt-2">{error}</div>}
      
      <ConfirmDeleteModal
        show={showConfirm}
        onClose={handleClose}
        onConfirm={handleConfirm}
        channelName={channelName}
        loading={loading}
      />
    </div>
  );
};

export default ChannelDelete;