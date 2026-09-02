import {
  getDisplayNameViolation,
  getDisplayNameViolationMessage,
  normalizeDisplayName,
} from './display-name-policy';

describe('display-name-policy', () => {
  it('normalizes surrounding whitespace', () => {
    expect(normalizeDisplayName('  Rachel C  ')).toBe('Rachel C');
  });

  it('allows a safe display name', () => {
    expect(getDisplayNameViolation('Rachel C')).toBeNull();
  });

  it.each([
    ['missing', null, 'required'],
    ['empty', '   ', 'required'],
    ['too long', 'a'.repeat(81), 'too_long'],
    ['prohibited', 'Ash0le', 'prohibited'],
  ])('detects %s display names', (_description, displayName, violation) => {
    expect(getDisplayNameViolation(displayName)).toBe(violation);
  });

  it('provides a user-facing prohibited-language message', () => {
    expect(getDisplayNameViolationMessage('prohibited')).toBe(
      'This display name contains prohibited language.',
    );
  });
});
