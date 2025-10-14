import React from 'react';
import { Pagination, Form } from 'react-bootstrap';

interface PaginationComponentProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  siblingCount?: number; // Number of pages to show on each side of current page
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  siblingCount = 2
}) => {
  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );
    
    // First page
    if (currentPage > siblingCount + 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => onPageChange(1)}>
          1
        </Pagination.Item>
      );
      
      if (currentPage > siblingCount + 2) {
        items.push(<Pagination.Ellipsis key="ellipsis-start" />);
      }
    }
    
    // Pages around current page
    const startPage = Math.max(2, currentPage - siblingCount);
    const endPage = Math.min(totalPages - 1, currentPage + siblingCount);
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Last page
    if (currentPage < totalPages - siblingCount) {
      if (currentPage < totalPages - siblingCount - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-end" />);
      }
      
      items.push(
        <Pagination.Item
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next
        key="next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );
    
    return items;
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  // Calculate start and end item indices
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4">
      {/* Items per page selector and item count */}
      <div className="d-flex align-items-center mb-3 mb-md-0">
        <span className="me-2">每页显示:</span>
        <Form.Select
          size="sm"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          style={{ width: 'auto' }}
          className="me-3"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Form.Select>
        
        <span>
          显示 {startIndex}-{endIndex} 条，共 {totalItems} 条记录
        </span>
      </div>
      
      {/* Pagination controls */}
      <div>
        <Pagination className="mb-0">
          {generatePaginationItems()}
        </Pagination>
      </div>
    </div>
  );
};

export default PaginationComponent;