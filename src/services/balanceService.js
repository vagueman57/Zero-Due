const store = require('../data/store');
const { normalizeAmount } = require('../utils/math');
const { simplifyBalances } = require('./simplifier');

/**
 * Get or create a ledger for a specific user in a group.
 * If groupId is null/undefined, operates on global balances.
 */
function getUserLedger(userId, groupId = null) {
  let ledgerContainer;

  if (groupId) {
    // Per-group ledger
    if (!store.groupBalances[groupId]) {
      store.groupBalances[groupId] = {};
    }
    ledgerContainer = store.groupBalances[groupId];
  } else {
    // Global ledger (for non-group expenses)
    ledgerContainer = store.balances;
  }

  if (!ledgerContainer[userId]) {
    ledgerContainer[userId] = {};
  }

  return ledgerContainer[userId];
}

/**
 * Apply a debt within a specific ledger (group or global).
 * Adds to existing debt or creates new entry.
 */
function applyDebt(fromUser, toUser, rawAmount, groupId = null) {
  if (!fromUser || !toUser || fromUser === toUser) return;
  const amount = normalizeAmount(rawAmount);
  if (amount === 0) return;

  const ledger = getUserLedger(fromUser, groupId);
  const updated = normalizeAmount((ledger[toUser] || 0) + amount);

  if (updated === 0) {
    delete ledger[toUser];
  } else {
    ledger[toUser] = updated;
  }
}

/**
 * Apply an expense (group or non-group).
 * If groupId is provided, updates per-group ledger.
 * If groupId is null, updates global ledger.
 */
function applyExpense(payerId, splits, groupId = null) {
  if (!payerId || !splits || typeof splits !== 'object') {
    throw new Error('Invalid expense payload');
  }

  for (const [userId, amount] of Object.entries(splits)) {
    if (userId === payerId) continue;
    applyDebt(userId, payerId, amount, groupId);
  }

  // Optional: Simplify debts within this context (group or global)
  // Disabled for now; can be enabled per group with a toggle
  // if (groupId) {
  //   store.groupBalances[groupId] = simplifyBalances(store.groupBalances[groupId]);
  // } else {
  //   store.balances = simplifyBalances(store.balances);
  // }
}

/**
 * Settle a debt within a specific ledger (group or global).
 * Reduces the outstanding balance.
 */
function settleDebt(fromUser, toUser, rawAmount, groupId = null) {
  if (!fromUser || !toUser || fromUser === toUser) {
    throw new Error('Invalid settlement participants');
  }

  const amount = normalizeAmount(rawAmount);
  if (amount <= 0) {
    throw new Error('Settlement amount must be positive');
  }

  const ledger = getUserLedger(fromUser, groupId);
  const current = normalizeAmount(ledger[toUser] || 0);

  if (current === 0) {
    throw new Error('No outstanding balance to settle');
  }

  const remaining = normalizeAmount(current - amount);
  if (remaining < 0) {
    throw new Error('Settlement exceeds owed amount');
  }

  if (remaining === 0) {
    delete ledger[toUser];
  } else {
    ledger[toUser] = remaining;
  }

  
  if (groupId) {
    store.groupBalances[groupId] = simplifyBalances(store.groupBalances[groupId]);
  } else {
    store.balances = simplifyBalances(store.balances);
  }
}

module.exports = {
  getUserLedger,
  applyExpense,
  settleDebt
};