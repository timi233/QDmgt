import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, InputGroup } from 'react-bootstrap';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

interface SearchFilterProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: {
    status?: string;
    businessType?: string;
    targetCompletion?: string;
  }) => void;
  onReset: () => void;
  initialFilters?: {
    status?: string;
    businessType?: string;
    targetCompletion?: string;
  };
}

const SearchFilter: React.FC<SearchFilterProps> = ({ 
  onSearch, 
  onFilterChange, 
  onReset,
  initialFilters = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    businessType: '',
    targetCompletion: ''
  });

  // Initialize filters if provided
  useEffect(() => {
    setFilters({
      status: initialFilters.status || '',
      businessType: initialFilters.businessType || '',
      targetCompletion: initialFilters.targetCompletion || ''
    });
  }, [initialFilters]);

  // Handle search term change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Reset all filters
  const handleReset = () => {
    setSearchTerm('');
    setFilters({
      status: '',
      businessType: '',
      targetCompletion: ''
    });
    onReset();
  };

  // Trigger search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchTerm);
    }
  };

  return (
    <div className="search-filter-container mb-4">
      <Row className="gy-3">
        {/* Search Input */}
        <Col md={6} lg={4}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="搜索渠道名称或描述..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
            />
            <Button 
              variant="outline-secondary" 
              onClick={() => onSearch(searchTerm)}
            >
              <FaSearch />
            </Button>
          </InputGroup>
        </Col>

        {/* Status Filter */}
        <Col md={6} lg={2}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">非活跃</option>
            <option value="suspended">暂停</option>
          </Form.Select>
        </Col>

        {/* Business Type Filter */}
        <Col md={6} lg={2}>
          <Form.Select
            value={filters.businessType}
            onChange={(e) => handleFilterChange('businessType', e.target.value)}
          >
            <option value="">所有类型</option>
            <option value="basic">基本盘渠道</option>
            <option value="high-value">高价值渠道</option>
            <option value="pending-signup">待签约渠道</option>
          </Form.Select>
        </Col>

        {/* Target Completion Filter */}
        <Col md={6} lg={2}>
          <Form.Select
            value={filters.targetCompletion}
            onChange={(e) => handleFilterChange('targetCompletion', e.target.value)}
          >
            <option value="">目标完成度</option>
            <option value="above-80">≥80%</option>
            <option value="60-80">60%-80%</option>
            <option value="below-60">&lt;60%</option>
          </Form.Select>
        </Col>

        {/* Reset Button */}
        <Col md={12} lg={2}>
          <Button 
            variant="outline-secondary" 
            className="w-100"
            onClick={handleReset}
          >
            <FaTimes className="me-1" /> 重置
          </Button>
        </Col>
      </Row>

      {/* Advanced Filters Toggle */}
      <div className="mt-3">
        <Button 
          variant="link" 
          size="sm"
          className="p-0"
          onClick={() => {
            // Will implement advanced filters modal in future
            alert('高级筛选功能将在后续版本中实现');
          }}
        >
          <FaFilter className="me-1" /> 高级筛选选项
        </Button>
      </div>
    </div>
  );
};

export default SearchFilter;