const store = require('../data/store');
const { normalizeAmount } = require('../utils/math');

// Lazy initialization for user ledger
function getUserLedger(userId) {
  if (!store.balances[userId]) {
    store.balances[userId] = {};
  }
  return store.balances[userId];
}


// Update balance safely
function addBalance(fromUser, toUser, amount) {
  const ledger = getUserLedger(fromUser);
  ledger[toUser] = normalizeAmount((ledger[toUser] || 0) + amount);

  // Remove zero entries
  if (ledger[toUser] === 0) {
    delete ledger[toUser];
  }
}


module.exports = {
  getUserLedger,
  addBalance
};
