import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { describe, it, expect } from 'vitest';

describe('Button component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button.className).toContain('destructive');
  });
});
