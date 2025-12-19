const { normalizeAmount } = require('../utils/math'); // Ensure this exists!

/**
 * Algo: Net Balance Greedy Matching
 * Time Complexity: O(N log N)
 */
function simplifyBalances(balances) {
  const net = {};

  // 1. Compute Net Flow
  // Input: { A: { B: 10 }, B: { C: 10 } }
  // Net: { A: -10, B: 0, C: +10 }
  if (!balances) return {};

  for (const fromUser in balances) {
    for (const toUser in balances[fromUser]) {
      const amount = balances[fromUser][toUser];
      // Defensive: Ensure we don't carry over bad math
      const safeAmount = normalizeAmount(amount);

      net[fromUser] = normalizeAmount((net[fromUser] || 0) - safeAmount);
      net[toUser]   = normalizeAmount((net[toUser] || 0) + safeAmount);
    }
  }

  // 2. Separate & Sort
  const debtors = [];
  const creditors = [];

  // Threshold to ignore "dust" (e.g. 0.00001 cents)
  const EPSILON = 0.009; 

  for (const user in net) {
    const amount = net[user];
    // Only process significant balances
    if (Math.abs(amount) < EPSILON) continue; 

    if (amount < 0) {
      debtors.push({ user, amount: -amount }); // Store positive magnitude
    } else {
      creditors.push({ user, amount: amount });
    }
  }

  // Sort descending (Greedy approach)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // 3. Match & Settle
  const simplified = {};
  let i = 0; // Index for debtors
  let j = 0; // Index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the Minimum of what Debtor owes vs what Creditor needs
    const amount = normalizeAmount(Math.min(debtor.amount, creditor.amount));

    // Record the transaction
    if (!simplified[debtor.user]) simplified[debtor.user] = {};
    simplified[debtor.user][creditor.user] = amount;

    // Update remaining amounts
    debtor.amount = normalizeAmount(debtor.amount - amount);
    creditor.amount = normalizeAmount(creditor.amount - amount);

    // If fully settled, move to next person. 
    // Use loose epsilon check for zero safety.
    if (debtor.amount < EPSILON) i++;
    if (creditor.amount < EPSILON) j++;
  }

  return simplified;
}

module.exports = { simplifyBalances };