const { simplifyBalances } = require('../src/services/simplifier');

describe('simplifyBalances', () => {

  test('removes simple transitive debt', () => {
    const balances = {
      A: { B: 10 },
      B: { C: 10 }
    };

    const result = simplifyBalances(balances);

    expect(result).toEqual({
      A: { C: 10 }
    });
  });

  test('handles partial transitive debt correctly', () => {
    const balances = {
      A: { B: 10 },
      B: { C: 5 }
    };

    const result = simplifyBalances(balances);

    expect(result).toEqual({
      A: { B: 5, C: 5 }
    });
  });

  test('eliminates circular debt completely', () => {
    const balances = {
      A: { B: 10 },
      B: { C: 10 },
      C: { A: 10 }
    };

    const result = simplifyBalances(balances);

    expect(result).toEqual({});
  });

  test('handles multiple debtors and creditors', () => {
    const balances = {
      A: { D: 30 },
      B: { D: 20 },
      C: { D: 10 }
    };

    const result = simplifyBalances(balances);

    expect(result).toEqual({
      A: { D: 30 },
      B: { D: 20 },
      C: { D: 10 }
    });
  });

  test('ignores dust balances below epsilon', () => {
    const balances = {
      A: { B: 10.0000001 },
      B: { C: 10 }
    };

    const result = simplifyBalances(balances);

    expect(result).toEqual({
      A: { C: 10 }
    });
  });

  test('returns empty object for empty or null input', () => {
    expect(simplifyBalances({})).toEqual({});
    expect(simplifyBalances(null)).toEqual({});
    expect(simplifyBalances(undefined)).toEqual({});
  });

  test('result contains no zero or near-zero edges', () => {
    const balances = {
      A: { B: 10 },
      B: { C: 9.991 }
    };

    const result = simplifyBalances(balances);

    for (const from in result) {
      for (const to in result[from]) {
        expect(result[from][to]).toBeGreaterThan(0);
      }
    }
  });

});


test('preserves legitimate small balances (real money)', () => {
  const balances = {
    A: { B: 10.01 },
    B: { C: 10 }
  };

  const result = simplifyBalances(balances);

  expect(result).toEqual({
    A: { B: 0.01, C: 10 }
  });
});
