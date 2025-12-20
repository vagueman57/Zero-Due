const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.post('/', (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'id and name required' });
  }

  // Prevent duplicate users
  if (store.users[id]) {
    return res.status(409).json({ error: 'User ID already exists' });
  }

  store.users[id] = { id, name };
  res.status(201).json(store.users[id]);
});

// Get balance summary for a user (aggregates global + per-group, one-sided)
// Get simplified balance summary for a user
router.get('/:userId/balances', (req, res) => {
  const { userId } = req.params;

  if (!store.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { normalizeAmount } = require('../utils/math');
  const { simplifyBalances } = require('../services/simplifier');

  // Merge all balances (global + per-group) into one ledger
  const mergedLedger = {};

  // 1) Global balances
  for (const fromUser in store.balances) {
    if (!mergedLedger[fromUser]) mergedLedger[fromUser] = {};
    Object.assign(mergedLedger[fromUser], store.balances[fromUser]);
  }

  // 2) Per-group balances
  for (const groupId in store.groupBalances) {
    const ledger = store.groupBalances[groupId];
    for (const fromUser in ledger) {
      if (!mergedLedger[fromUser]) mergedLedger[fromUser] = {};
      for (const toUser in ledger[fromUser]) {
        const amount = ledger[fromUser][toUser];
        mergedLedger[fromUser][toUser] = normalizeAmount((mergedLedger[fromUser][toUser] || 0) + amount);
      }
    }
  }

  // Simplify to get minimal transactions
  const simplified = simplifyBalances(mergedLedger);

  // Extract only this user's simplified balances
  const userBalance = simplified[userId] || {};

  res.json({
    user: userId,
    owes: userBalance
  });
});

module.exports = router;