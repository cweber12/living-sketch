import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Toolbar,
  ToolbarSection,
  SegmentedControl,
} from '@/components/ui/toolbar';

// Mock matchMedia — default to desktop (> 640px)
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

describe('ToolbarSection', () => {
  it('renders label and children', () => {
    render(
      <ToolbarSection label="Draw">
        <button>Test Button</button>
      </ToolbarSection>,
    );
    expect(screen.getByText('Draw')).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
});

describe('Toolbar', () => {
  it('renders children inside side mode on desktop', () => {
    mockMatchMedia(false); // desktop
    render(
      <Toolbar sideWidth={200}>
        <span>Tool Content</span>
      </Toolbar>,
    );
    expect(screen.getByText('Tool Content')).toBeInTheDocument();
  });

  it('renders children inside top mode on mobile', () => {
    mockMatchMedia(true); // mobile
    render(
      <Toolbar sideWidth={200}>
        <span>Mobile Content</span>
      </Toolbar>,
    );
    expect(screen.getByText('Mobile Content')).toBeInTheDocument();
  });

  it('has collapse/expand toggle', () => {
    mockMatchMedia(false);
    render(
      <Toolbar sideWidth={200}>
        <span>Content</span>
      </Toolbar>,
    );
    const collapseBtn = screen.getByLabelText('Collapse sidebar');
    expect(collapseBtn).toBeInTheDocument();
    fireEvent.click(collapseBtn);
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('has mode switch button on desktop', () => {
    mockMatchMedia(false);
    render(
      <Toolbar sideWidth={200}>
        <span>Content</span>
      </Toolbar>,
    );
    expect(screen.getByTitle('Switch to top toolbar')).toBeInTheDocument();
  });
});
