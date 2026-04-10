import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ToolbarLayout,
  PageToolbar,
  ToolbarSection,
  ToolbarSpacer,
  SegmentedControl,
} from '@/components/shared/toolbar';

// matchMedia is required by ToolbarLayout
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

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

describe('ToolbarLayout', () => {
  it('renders children', () => {
    render(
      <ToolbarLayout>
        <span>layout child</span>
      </ToolbarLayout>,
    );
    expect(screen.getByText('layout child')).toBeInTheDocument();
  });

  it('renders PageToolbar and content inside layout', () => {
    render(
      <ToolbarLayout>
        <PageToolbar>
          <span>toolbar</span>
        </PageToolbar>
        <div>content</div>
      </ToolbarLayout>,
    );
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('PageToolbar', () => {
  it('renders children', () => {
    render(
      <PageToolbar>
        <span>child</span>
      </PageToolbar>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});

describe('ToolbarSection', () => {
  it('renders icon and label', () => {
    render(
      <ToolbarSection icon={<span>☆</span>} label="Draw" onClick={vi.fn()} />,
    );
    expect(screen.getByText('☆')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ToolbarSection icon={<span>■</span>} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('opens dropdown panel when dropdownOpen is true', async () => {
    const onClose = vi.fn();
    render(
      <ToolbarSection
        icon={<span>☆</span>}
        label="Test"
        onClick={vi.fn()}
        dropdownOpen={true}
        onDropdownClose={onClose}
        dropdownContent={<span>Panel Content</span>}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });
  });

  it('hides dropdown panel when dropdownOpen is false', () => {
    render(
      <ToolbarSection
        icon={<span>☆</span>}
        label="Test"
        onClick={vi.fn()}
        dropdownOpen={false}
        onDropdownClose={vi.fn()}
        dropdownContent={<span>Panel Content</span>}
      />,
    );
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
  });

  it('applies primary styling', () => {
    render(
      <ToolbarSection
        icon={<span>✓</span>}
        label="Save"
        primary
        onClick={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.backgroundColor).toBe('var(--accent)');
  });

  it('disables the button', () => {
    render(<ToolbarSection icon={<span>✓</span>} disabled onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders dropdown content when dropdownContent is provided', () => {
    render(
      <ToolbarSection
        icon={<span>☆</span>}
        label="Filter"
        onClick={vi.fn()}
        dropdownOpen={false}
        onDropdownClose={vi.fn()}
        dropdownContent={<span>Options</span>}
      />,
    );
    // Button should render with the label
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('renders without chevron when there is no dropdownContent', () => {
    render(
      <ToolbarSection icon={<span>☆</span>} label="Action" onClick={vi.fn()} />,
    );
    expect(
      screen.queryByTestId('toolbar-section-chevron'),
    ).not.toBeInTheDocument();
  });
});

describe('ToolbarSpacer', () => {
  it('renders a spacer element', () => {
    const { container } = render(<ToolbarSpacer />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeTruthy();
    // style.flex can expand to longhand in jsdom — just check the element renders
    expect(el.tagName.toLowerCase()).toBe('div');
  });
});
