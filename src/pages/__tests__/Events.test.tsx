import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import Events from '../Events';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Test data
const mockEvents = [
  {
    id: '1',
    user_id: 'user1',
    title: 'Test Event 1',
    description: 'Test Description 1',
    event_type: 'shared_link',
    event_link: 'https://test1.com',
    created_at: new Date().toISOString(),
    profile_data: {
      id: 'user1',
      full_name: 'Test User 1',
      avatar_url: null
    }
  },
  {
    id: '2',
    user_id: 'user2',
    title: 'Test Event 2',
    description: 'Test Description 2',
    event_type: 'created_event',
    event_date: new Date().toISOString(),
    event_location: 'Test Location',
    event_category: 'business',
    max_attendees: 50,
    created_at: new Date().toISOString(),
    profile_data: {
      id: 'user2',
      full_name: 'Test User 2',
      avatar_url: null
    }
  }
];

const renderEvents = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Events />
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Events Page', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock authenticated user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    });

    // Mock successful events fetch
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockEvents,
          error: null
        })
      })
    });
  });

  it('renders loading state initially', () => {
    renderEvents();
    expect(screen.getByText('Loading event links...')).toBeInTheDocument();
  });

  it('renders events after loading', async () => {
    renderEvents();
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    });
  });

  it('displays event types correctly', async () => {
    renderEvents();
    await waitFor(() => {
      expect(screen.getByText('External Link')).toBeInTheDocument();
      expect(screen.getByText('Created Event')).toBeInTheDocument();
    });
  });

  it('shows post event form when button is clicked', async () => {
    renderEvents();
    await waitFor(() => {
      const postButton = screen.getByRole('button', { name: /^Post Event$/i });
      fireEvent.click(postButton);
    });
    expect(screen.getByText('Event Type *')).toBeInTheDocument();
  });

  it('shows event link input only for shared_link type', async () => {
    renderEvents();
    
    // Wait for initial render and click post button
    await waitFor(() => {
      const postButton = screen.getByRole('button', { name: /^Post Event$/i });
      fireEvent.click(postButton);
    });

    // Initially should show event link input (default type is shared_link)
    expect(screen.getByPlaceholderText('https://example.com/event')).toBeInTheDocument();

    // Change to created_event type
    const typeSelect = screen.getByRole('combobox');
    fireEvent.click(typeSelect);
    
    await waitFor(() => {
      const createEventOption = screen.getByText('Create New Event');
      fireEvent.click(createEventOption);
    });

    // Event link input should be gone
    expect(screen.queryByPlaceholderText('https://example.com/event')).not.toBeInTheDocument();
    
    // But date and time inputs should appear
    expect(screen.getByLabelText(/Event Date \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Time \*/i)).toBeInTheDocument();
  });

  it('validates required fields before posting', async () => {
    renderEvents();
    
    // Wait for initial render and click post button
    await waitFor(() => {
      const postButton = screen.getByRole('button', { name: /^Post Event$/i });
      fireEvent.click(postButton);
    });

    // Try to post without required fields
    const submitButton = screen.getAllByRole('button', { name: /Post Event/i })[1];
    fireEvent.click(submitButton);

    // Should show validation message
    expect(screen.getByText('Please provide an event title.')).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    // Mock failed events fetch
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to fetch' }
        })
      })
    });

    renderEvents();
    await waitFor(() => {
      expect(screen.getByText('Error loading events')).toBeInTheDocument();
    });
  });

  it('displays empty state when no events exist', async () => {
    // Mock empty events fetch
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    });

    renderEvents();
    await waitFor(() => {
      expect(screen.getByText('No event links yet')).toBeInTheDocument();
    });
  });
});