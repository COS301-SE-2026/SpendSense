const XP_PER_LEVEL = 100;

export function calculateMascotLevel(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}
