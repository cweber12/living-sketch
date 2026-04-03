import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Toolbar,
  ToolbarDropdown,
  SegmentedControl,
} from '@/components/ui/toolbar';

// Mock matchMedia -- default to desktop (no mobile match)
function mockMatchMedia(matches = false) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((_, cb) => listeners.push(cb)),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  return listeners;
}

describe('SegmentedControl', () => {
  it('renders all options', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={['a', 'b', 'c']}
        value="a"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    render(
      <SegmentedControl
        options={['up', 'down']}
        value="up"
        onChange={vi.fn()}
        labels={{ up: 'Arms Up', down: 'Arms Down' }}
      />,
    );
    expect(screen.getByText('Arms Up')).toBeInTheDocument();
    expect(screen.getByText('Arms Down')).toBeInTheDocument();
  });

  it('calls onChange when an option is clicked', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl options={['x', 'y']} value="x" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText('y'));
    expect(onChange).toHaveBeenCalledWith('y');
  });

  it('applies accent style to active option', () => {
    render(
      <SegmentedControl options={['a', 'b']} value="a" onChange={vi.fn()} />,
    );
    const btn = screen.getByText('a');
    expect(btn.style.backgroundColor).toBe('var(--accent)');
  });

  it('applies danger style to dangerValue when active', () => {
    render(
      <SegmentedControl
        options={['pen', 'eraser']}
        value="eraser"
        onChange={vi.fn()}
        dangerValue="eraser"
      />,
    );
    const btn = screen.getByText('eraser');
    expect(btn.style.backgroundColor).toBe('var(--danger)');
  });
});

describe('ToolbarDropdown', () => {
  it('renders nothing by itself', () => {
    const { container } = render(
      <ToolbarDropdown id="test" label="Test">
        <span>Panel content</span>
      </ToolbarDropdown>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Toolbar', () => {
  it('renders dropdown buttons in side mode on desktop', () => {
    mockMatchMedia(false); // desktop
    render(
      <Toolbar>
        <ToolbarDropdown id="draw" label="Draw">
          <span>Draw Panel</span>
        </ToolbarDropdown>
      </Toolbar>,
    );
    expect(screen.getByTitle('Draw')).toBeInTheDocument();
  });

  it('renders dropdown buttons in top mode on mobile', () => {
    mockMatchMedia(true); // mobile
    render(
      <Toolbar>
        <ToolbarDropdown id="draw" label="Draw">
          <span>Draw Panel</span>
        </ToolbarDropdown>
      </Toolbar>,
    );
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('shows panel content when button is clicked', async () => {
    mockMatchMedia(false); // desktop (side mode)
    render(
      <Toolbar>
        <ToolbarDropdown id="draw" label="Draw">
          <span>Draw Panel Content</span>
        </ToolbarDropdown>
      </Toolbar>,
    );
    const btn = screen.getByTitle('Draw');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Draw Panel Content')).toBeInTheDocument();
    });
  });

  it('closes panel when same button is clicked again', async () => {
    mockMatchMedia(false);
    render(
      <Toolbar>
        <ToolbarDropdown id="draw" label="Draw">
          <span>Draw Panel Content</span>
        </ToolbarDropdown>
      </Toolbar>,
    );
    const btn = screen.getByTitle('Draw');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Draw Panel Content')).toBeInTheDocument();
    });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.queryByText('Draw Panel Content')).not.toBeInTheDocument();
    });
  });

  it('has mode switch button on desktop', () => {
    mockMatchMedia(false);
    render(
      <Toolbar>
        <ToolbarDropdown id="draw" label="Draw">
          <span>Panel</span>
        </ToolbarDropdown>
      </Toolbar>,
    );
    expect(screen.getByTitle('Switch to top toolbar')).toBeInTheDocument();
  });
});
