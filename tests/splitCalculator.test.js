const SplitCalculator = require('../src/services/splitCalculator');

describe('SplitCalculator - Equal Split', () => {

  test('splits 100 equally between 2 users', () => {
    const result = SplitCalculator.calculateEqualSplit(100, ['u1', 'u2']);

    expect(result).toEqual({
      u1: 50,
      u2: 50
    });
  });

});

test('handles penny problem for 100 split among 3 users', () => {
  const result = SplitCalculator.calculateEqualSplit(100, ['u1', 'u2', 'u3']);

  const total = Object.values(result).reduce((a, b) => a + b, 0);

  expect(total).toBe(100);
  expect(Object.values(result)).toContain(33.34);
});

test('remainder is assigned deterministically', () => {
  const result = SplitCalculator.calculateEqualSplit(100, ['b', 'a', 'c']);

  expect(result).toEqual({
    a: 33.34,
    b: 33.33,
    c: 33.33
  });
});

describe('SplitCalculator - Exact Split', () => {

  test('accepts valid exact split', () => {
    const result = SplitCalculator.calculateExactSplit(30, {
      u1: 10,
      u2: 20
    });

    expect(result).toEqual({
      u1: 10,
      u2: 20
    });
  });

  test('throws error if exact split does not sum to total', () => {
    expect(() => {
      SplitCalculator.calculateExactSplit(30, {
        u1: 10,
        u2: 15
      });
    }).toThrow();
  });

});

describe('SplitCalculator - Percentage Split', () => {

  test('splits correctly with percentages', () => {
    const result = SplitCalculator.calculatePercentageSplit(100, {
      u1: 50,
      u2: 50
    });

    expect(result).toEqual({
      u1: 50,
      u2: 50
    });
  });

  test('throws error if percentages do not sum to 100', () => {
    expect(() => {
      SplitCalculator.calculatePercentageSplit(100, {
        u1: 30,
        u2: 50
      });
    }).toThrow();
  });

});
