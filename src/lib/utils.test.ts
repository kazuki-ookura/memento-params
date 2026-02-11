import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'is-true', false && 'is-false')).toContain('base');
    expect(cn('base', true && 'is-true', false && 'is-false')).toContain('is-true');
    expect(cn('base', true && 'is-true', false && 'is-false')).not.toContain('is-false');
  });
});
