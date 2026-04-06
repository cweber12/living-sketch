import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  PageToolbar,
  ToolbarSection,
  ToolbarSpacer,
  SegmentedControl,
} from '@/components/shared/ui/toolbar';

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
});

describe('ToolbarSpacer', () => {
  it('renders a flex-1 spacer', () => {
    const { container } = render(<ToolbarSpacer />);
    expect(container.firstChild).toHaveClass('flex-1');
  });
});
