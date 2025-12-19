const store = require('../data/store');
const { normalizeAmount } = require('../utils/math');
const { simplifyBalances } = require('./simplifier');

function getUserLedger(userId) {
  if (!store.balances[userId]) {
    store.balances[userId] = {};
  }
  return store.balances[userId];
}

function applyDebt(fromUser, toUser, rawAmount) {
  if (!fromUser || !toUser || fromUser === toUser) return;
  const amount = normalizeAmount(rawAmount);
  if (amount === 0) return;

  const ledger = getUserLedger(fromUser);
  const updated = normalizeAmount((ledger[toUser] || 0) + amount);

  if (updated === 0) {
    delete ledger[toUser];
  } else {
    ledger[toUser] = updated;
  }
}

function applyExpense(payerId, splits) {
  if (!payerId || !splits || typeof splits !== 'object') {
    throw new Error('Invalid expense payload');
  }

  for (const [userId, amount] of Object.entries(splits)) {
    if (userId === payerId) continue;
    applyDebt(userId, payerId, amount);
  }

  store.balances = simplifyBalances(store.balances);
}

function settleDebt(fromUser, toUser, rawAmount) {
  if (!fromUser || !toUser || fromUser === toUser) {
    throw new Error('Invalid settlement participants');
  }

  const amount = normalizeAmount(rawAmount);
  if (amount <= 0) {
    throw new Error('Settlement amount must be positive');
  }

  const ledger = getUserLedger(fromUser);
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

  store.balances = simplifyBalances(store.balances);
}

module.exports = {
  getUserLedger,
  applyExpense,
  settleDebt
};