import React, { useState, useEffect, useMemo } from 'react';
import { Table, Card, Button, Spinner, Alert, Row, Col, Form } from 'react-bootstrap';
import SearchFilter from './SearchFilter';
import PaginationComponent from './Pagination';
import { Channel } from '../types';
import { formatDate } from '../utils/dateFormatter';

interface FiltersState {
  status: string;
  business_type: string;
  targetCompletion: string;
}

interface SearchFiltersInput {
  status?: string;
  businessType?: string;
  targetCompletion?: string;
}

interface ChannelListProps {
  onEdit?: (channel: Channel) => void;
  onView?: (channel: Channel) => void;
  onTargetPlanning?: (channelId: string) => void;
  onCreateNew?: () => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ onEdit, onView, onTargetPlanning, onCreateNew }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FiltersState>({
    status: '',
    business_type: '',
    targetCompletion: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  // Mock data - in a real implementation, this would come from an API
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate API call with pagination
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock channel data with pagination
        const mockChannels: Channel[] = Array.from({ length: 45 }, (_, i) => ({
          id: `${i + 1}`,
          name: `${['基本盘', '高价值', '待签约'][i % 3]}渠道-${i + 1}`,
          description: `这是第${i + 1}个渠道的描述信息`,
          status: ['active', 'inactive', 'suspended'][i % 3] as 'active' | 'inactive' | 'suspended',
          business_type: ['basic', 'high-value', 'pending-signup'][i % 3] as 'basic' | 'high-value' | 'pending-signup',
          contact_email: `contact${i + 1}@example.com`,
          contact_phone: `+${1000000000 + i}`,
          created_at: new Date(Date.now() - i * 86400000).toISOString(), // Different dates
          updated_at: i % 5 === 0 ? undefined : new Date(Date.now() - i * 43200000).toISOString(),
          created_by: 'system',
          last_modified_by: 'system'
        }));
        
        // Simulate filtering
        let filteredChannels = mockChannels;
        
        if (searchTerm) {
          filteredChannels = filteredChannels.filter(channel => 
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        if (filters.status) {
          filteredChannels = filteredChannels.filter(channel => channel.status === filters.status);
        }
        
        if (filters.business_type) {
          filteredChannels = filteredChannels.filter(channel => channel.business_type === filters.business_type);
        }
        
        // Simulate pagination
        const totalItems = filteredChannels.length;
        const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        const paginatedChannels = filteredChannels.slice(startIndex, endIndex);
        
        setChannels(paginatedChannels);
        setPagination(prev => ({
          ...prev,
          totalPages,
          totalItems
        }));
      } catch (err) {
        setError('Failed to load channels');
        console.error('Error loading channels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [searchTerm, filters, pagination.currentPage, pagination.itemsPerPage]);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: SearchFiltersInput) => {
    setFilters({
      status: newFilters.status ?? '',
      business_type: newFilters.businessType ?? '',
      targetCompletion: newFilters.targetCompletion ?? ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: '',
      business_type: '',
      targetCompletion: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Handle items per page change
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination(prev => ({ ...prev, itemsPerPage, currentPage: 1 })); // Reset to first page
  };

  if (loading && channels.length === 0) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">加载渠道列表...</p>
      </div>
    );
  }

  if (error && channels.length === 0) {
    return <Alert variant="danger">{error}</Alert>;
  }

  const initialFilters = useMemo(() => ({
    status: filters.status,
    businessType: filters.business_type,
    targetCompletion: filters.targetCompletion
  }), [filters]);

  return (
    <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5>渠道列表</h5>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={onCreateNew}>
              新增渠道
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {/* Search and Filter Component */}
        <SearchFilter 
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          initialFilters={initialFilters}
        />
        
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        
        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" size="sm" className="me-2" />
            <span>更新数据中...</span>
          </div>
        )}

        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>渠道名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>业务类型</th>
                <th>联系邮箱</th>
                <th>联系手机</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {channels.length > 0 ? (
                channels.map(channel => (
                  <tr key={channel.id}>
                    <td>{channel.name}</td>
                    <td>{channel.description}</td>
                    <td>
                      <span className={
                        channel.status === 'active' ? 'text-success' : 
                        channel.status === 'inactive' ? 'text-warning' : 'text-danger'
                      }>
                        {channel.status === 'active' ? '活跃' : 
                         channel.status === 'inactive' ? '非活跃' : '暂停'}
                      </span>
                    </td>
                    <td>
                      {channel.business_type === 'basic' ? '基本盘' : 
                       channel.business_type === 'high-value' ? '高价值' : '待签约'}
                    </td>
                    <td>{channel.contact_email}</td>
                    <td>{channel.contact_phone}</td>
                    <td>{formatDate(channel.created_at)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => onView && onView(channel)}
                        >
                          查看
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          onClick={() => onEdit && onEdit(channel)}
                        >
                          编辑
                        </Button>
                        {onTargetPlanning && (
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            onClick={() => onTargetPlanning(channel.id)}
                          >
                            目标规划
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center">
                    {loading ? '加载中...' : '未找到匹配的渠道'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        
        {/* Pagination Component */}
        <PaginationComponent
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Card.Body>
    </Card>
  );
};

export default ChannelList;
