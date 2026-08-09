import { calculateMascotLevel } from './mascot-level';

// to run the tests in this file by itself: npm test -- mascot-level.spec.ts
describe('calculateMascotLevel', () => {
  it('starts at level 1 with zero xp', () => {
    expect(calculateMascotLevel(0)).toBe(1);
  });

  it('stays at level 1 until the first 100xp threshold', () => {
    expect(calculateMascotLevel(99)).toBe(1);
  });

  it('reaches level 2 exactly at 100xp', () => {
    expect(calculateMascotLevel(100)).toBe(2);
  });

  it('follows the flat 100xp-per-level curve for larger values', () => {
    expect(calculateMascotLevel(250)).toBe(3);
    expect(calculateMascotLevel(999)).toBe(10);
    expect(calculateMascotLevel(1000)).toBe(11);
  });
});
