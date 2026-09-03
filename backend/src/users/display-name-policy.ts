import Filter from 'bad-words';

export const MAX_DISPLAY_NAME_LENGTH = 80;

export type DisplayNameViolation = 'required' | 'too_long' | 'prohibited';

const profanityFilter = new Filter();

export function normalizeDisplayName(displayName: string | null | undefined) {
  return displayName?.trim() ?? '';
}

export function getDisplayNameViolation(
  displayName: string | null | undefined,
): DisplayNameViolation | null {
  const normalizedDisplayName = normalizeDisplayName(displayName);

  if (!normalizedDisplayName) {
    return 'required';
  }

  if (normalizedDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return 'too_long';
  }

  if (profanityFilter.isProfane(normalizedDisplayName)) {
    return 'prohibited';
  }

  return null;
}

export function getDisplayNameViolationMessage(
  violation: DisplayNameViolation,
) {
  switch (violation) {
    case 'required':
      return 'A display name is required';
    case 'too_long':
      return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
    case 'prohibited':
      return 'This display name contains prohibited language.';
  }
}
