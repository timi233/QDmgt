import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import ChannelList from '../components/ChannelList';
import SearchFilter from '../components/SearchFilter';
import PaginationComponent from '../components/Pagination';

// Mock data for testing
const mockChannels = [
  {
    id: '1',
    name: '基本盘渠道-1',
    description: '主要客户渠道',
    status: 'active',
    businessType: 'basic',
    contactEmail: 'contact1@example.com',
    contactPhone: '+1234567890',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-05-20T14:45:00Z'
  },
  {
    id: '2',
    name: '高价值渠道-1',
    description: '战略合作伙伴',
    status: 'active',
    businessType: 'high-value',
    contactEmail: 'contact2@example.com',
    contactPhone: '+0987654321',
    createdAt: '2025-02-20T09:15:00Z',
    updatedAt: '2025-06-10T11:30:00Z'
  },
  {
    id: '3',
    name: '待签约渠道-1',
    description: '潜在合作伙伴',
    status: 'inactive',
    businessType: 'pending-signup',
    contactEmail: 'contact3@example.com',
    contactPhone: '+1122334455',
    createdAt: '2025-03-05T13:20:00Z',
    updatedAt: null
  }
];

// Mock server for API requests
const server = setupServer(
  rest.get('/api/channels', (req, res, ctx) => {
    const search = req.url.searchParams.get('search');
    const status = req.url.searchParams.get('status');
    const businessType = req.url.searchParams.get('business_type');
    const skip = parseInt(req.url.searchParams.get('skip') || '0');
    const limit = parseInt(req.url.searchParams.get('limit') || '20');
    
    // Filter channels based on query parameters
    let filteredChannels = [...mockChannels];
    
    if (search) {
      filteredChannels = filteredChannels.filter(channel => 
        channel.name.toLowerCase().includes(search.toLowerCase()) ||
        (channel.description && channel.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    if (status) {
      filteredChannels = filteredChannels.filter(channel => channel.status === status);
    }
    
    if (businessType) {
      filteredChannels = filteredChannels.filter(channel => channel.businessType === businessType);
    }
    
    // Apply pagination
    const total = filteredChannels.length;
    const pages = Math.ceil(total / limit);
    const paginatedChannels = filteredChannels.slice(skip, skip + limit);
    
    return res(ctx.json({
      channels: paginatedChannels,
      total,
      skip,
      limit,
      pages
    }));
  })
);

// Setup and teardown for tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Search and Filter Functionality', () => {
  test('renders search filter component', () => {
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={jest.fn()} 
      onReset={jest.fn()} 
    />);
    
    expect(screen.getByPlaceholderText('搜索渠道名称或描述...')).toBeInTheDocument();
    expect(screen.getByText('所有状态')).toBeInTheDocument();
    expect(screen.getByText('所有类型')).toBeInTheDocument();
    expect(screen.getByText('目标完成度')).toBeInTheDocument();
  });

  test('allows user to enter search term', () => {
    const mockOnSearch = jest.fn();
    render(<SearchFilter 
      onSearch={mockOnSearch} 
      onFilterChange={jest.fn()} 
      onReset={jest.fn()} 
    />);
    
    const searchInput = screen.getByPlaceholderText('搜索渠道名称或描述...');
    fireEvent.change(searchInput, { target: { value: '基本盘' } });
    
    expect(searchInput).toHaveValue('基本盘');
  });

  test('allows user to select status filter', () => {
    const mockOnFilterChange = jest.fn();
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={mockOnFilterChange} 
      onReset={jest.fn()} 
    />);
    
    const statusSelect = screen.getByRole('combobox', { name: '' }); // Status dropdown
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active'
    }));
  });

  test('allows user to select business type filter', () => {
    const mockOnFilterChange = jest.fn();
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={mockOnFilterChange} 
      onReset={jest.fn()} 
    />);
    
    // Find the business type dropdown (second select element)
    const selects = screen.getAllByRole('combobox');
    const businessTypeSelect = selects[1];
    fireEvent.change(businessTypeSelect, { target: { value: 'basic' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      businessType: 'basic'
    }));
  });

  test('resets all filters when reset button is clicked', () => {
    const mockOnReset = jest.fn();
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={jest.fn()} 
      onReset={mockOnReset} 
    />);
    
    const resetButton = screen.getByText('重置');
    fireEvent.click(resetButton);
    
    expect(mockOnReset).toHaveBeenCalled();
  });
});

describe('Channel List with Search and Filter', () => {
  test('renders channel list with pagination', async () => {
    render(<ChannelList />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('加载渠道列表...')).not.toBeInTheDocument();
    });
    
    // Check that channels are displayed
    expect(screen.getByText('基本盘渠道-1')).toBeInTheDocument();
    expect(screen.getByText('高价值渠道-1')).toBeInTheDocument();
    expect(screen.getByText('待签约渠道-1')).toBeInTheDocument();
    
    // Check pagination controls
    expect(screen.getByText('显示 1-3 条，共 3 条记录')).toBeInTheDocument();
  });

  test('filters channels by search term', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchFilter 
      onSearch={mockOnSearch} 
      onFilterChange={jest.fn()} 
      onReset={jest.fn()} 
    />);
    
    const searchInput = screen.getByPlaceholderText('搜索渠道名称或描述...');
    fireEvent.change(searchInput, { target: { value: '基本盘' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', charCode: 13 });
    
    expect(mockOnSearch).toHaveBeenCalledWith('基本盘');
  });

  test('filters channels by status', async () => {
    const mockOnFilterChange = jest.fn();
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={mockOnFilterChange} 
      onReset={jest.fn()} 
    />);
    
    const statusSelect = screen.getByRole('combobox', { name: '' });
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active'
    }));
  });

  test('filters channels by business type', async () => {
    const mockOnFilterChange = jest.fn();
    render(<SearchFilter 
      onSearch={jest.fn()} 
      onFilterChange={mockOnFilterChange} 
      onReset={jest.fn()} 
    />);
    
    const selects = screen.getAllByRole('combobox');
    const businessTypeSelect = selects[1];
    fireEvent.change(businessTypeSelect, { target: { value: 'high-value' } });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      businessType: 'high-value'
    }));
  });
});

describe('Pagination Component', () => {
  test('renders pagination with correct item counts', () => {
    const mockOnPageChange = jest.fn();
    const mockOnItemsPerPageChange = jest.fn();
    
    render(
      <PaginationComponent
        currentPage={1}
        totalPages={3}
        totalItems={45}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
        onItemsPerPageChange={mockOnItemsPerPageChange}
      />
    );
    
    expect(screen.getByText('显示 1-20 条，共 45 条记录')).toBeInTheDocument();
    
    // Check pagination buttons
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  test('changes items per page', () => {
    const mockOnItemsPerPageChange = jest.fn();
    
    render(
      <PaginationComponent
        currentPage={1}
        totalPages={3}
        totalItems={45}
        itemsPerPage={20}
        onPageChange={jest.fn()}
        onItemsPerPageChange={mockOnItemsPerPageChange}
      />
    );
    
    const itemsPerPageSelect = screen.getByRole('combobox');
    fireEvent.change(itemsPerPageSelect, { target: { value: '50' } });
    
    expect(mockOnItemsPerPageChange).toHaveBeenCalledWith(50);
  });

  test('navigates to next page', () => {
    const mockOnPageChange = jest.fn();
    
    render(
      <PaginationComponent
        currentPage={1}
        totalPages={3}
        totalItems={45}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
        onItemsPerPageChange={jest.fn()}
      />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  test('navigates to specific page', () => {
    const mockOnPageChange = jest.fn();
    
    render(
      <PaginationComponent
        currentPage={1}
        totalPages={3}
        totalItems={45}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
        onItemsPerPageChange={jest.fn()}
      />
    );
    
    const pageTwoButton = screen.getByText('2');
    fireEvent.click(pageTwoButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });
});

describe('Integration Tests', () => {
  test('search and filter functionality works together', async () => {
    render(<ChannelList />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('加载渠道列表...')).not.toBeInTheDocument();
    });
    
    // Initially all channels should be visible
    expect(screen.getByText('基本盘渠道-1')).toBeInTheDocument();
    expect(screen.getByText('高价值渠道-1')).toBeInTheDocument();
    expect(screen.getByText('待签约渠道-1')).toBeInTheDocument();
    
    // Apply search filter
    const searchInput = screen.getByPlaceholderText('搜索渠道名称或描述...');
    fireEvent.change(searchInput, { target: { value: '基本盘' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', charCode: 13 });
    
    // Wait for update
    await waitFor(() => {
      expect(screen.queryByText('更新数据中...')).not.toBeInTheDocument();
    });
    
    // Only basic channels should be visible
    expect(screen.getByText('基本盘渠道-1')).toBeInTheDocument();
    expect(screen.queryByText('高价值渠道-1')).not.toBeInTheDocument();
    expect(screen.queryByText('待签约渠道-1')).not.toBeInTheDocument();
  });

  test('pagination works with filtered results', async () => {
    // Create more mock data to test pagination
    const manyChannels = Array.from({ length: 50 }, (_, i) => ({
      id: `${i + 1}`,
      name: `渠道-${i + 1}`,
      description: `这是第${i + 1}个渠道`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      businessType: ['basic', 'high-value', 'pending-signup'][i % 3],
      contactEmail: `contact${i + 1}@example.com`,
      contactPhone: `+${1000000000 + i}`,
      createdAt: new Date().toISOString(),
      updatedAt: null
    }));
    
    // Override the mock server handler for this test
    server.use(
      rest.get('/api/channels', (req, res, ctx) => {
        const skip = parseInt(req.url.searchParams.get('skip') || '0');
        const limit = parseInt(req.url.searchParams.get('limit') || '20');
        
        return res(ctx.json({
          channels: manyChannels.slice(skip, skip + limit),
          total: manyChannels.length,
          skip,
          limit,
          pages: Math.ceil(manyChannels.length / limit)
        }));
      })
    );
    
    render(<ChannelList />);
    
    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText('加载渠道列表...')).not.toBeInTheDocument();
    });
    
    // Check pagination shows correct counts
    expect(screen.getByText('显示 1-20 条，共 50 条记录')).toBeInTheDocument();
    
    // Navigate to next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Check pagination updated
    await waitFor(() => {
      expect(screen.getByText('显示 21-40 条，共 50 条记录')).toBeInTheDocument();
    });
  });
});