const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { settleDebt, applyExpense } = require('../services/balanceService');
const SplitCalculator = require('../services/splitCalculator');
/**
 * Settle a debt between two users.
 * Optional: groupId to settle within a specific group context.
 */
router.post('/', (req, res) => {
  const { from, to, amount, groupId } = req.body;

  if (!from || !to || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid settlement payload' });
  }

  if (!store.users[from] || !store.users[to]) {
    return res.status(400).json({ error: 'User does not exist' });
  }

  // If groupId is provided, validate group exists and both users are members
  if (groupId) {
    const group = store.groups[groupId];
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (!group.members.includes(from) || !group.members.includes(to)) {
      return res.status(400).json({ error: 'Both users must be members of the group' });
    }
  }

  try {
    settleDebt(from, to, amount, groupId || null);
    res.json({ message: 'Settlement successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/expense', (req, res) => {
  const { paidBy, amount, participants, splitType, splitDetails } = req.body;

  // Validate inputs
  if (!paidBy || !amount || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'Invalid expense payload' });
  }

  // Validate payer exists and is in participants
  if (!store.users[paidBy]) {
    return res.status(400).json({ error: 'Payer does not exist' });
  }

  if (!participants.includes(paidBy)) {
    return res.status(400).json({ error: 'Payer must be in participants list' });
  }

  // Validate all participants exist
  for (const userId of participants) {
    if (!store.users[userId]) {
      return res.status(400).json({ error: `User ${userId} does not exist` });
    }
  }

  let splits;

  try {
    // Calculate splits based on type
    switch (splitType) {
      case 'EQUAL':
        const involvedUsers = (splitDetails && Array.isArray(splitDetails) && splitDetails.length > 0) 
          ? splitDetails 
          : participants;
        splits = SplitCalculator.calculateEqualSplit(amount, involvedUsers);
        break;

      case 'EXACT':
        splits = SplitCalculator.calculateExactSplit(amount, splitDetails);
        break;

      case 'PERCENTAGE':
        splits = SplitCalculator.calculatePercentageSplit(amount, splitDetails);
        break;

      default:
        return res.status(400).json({ error: 'Invalid split type. Use EQUAL, EXACT, or PERCENTAGE' });
    }

    // Apply to global ledger (no groupId = global/friend expenses)
    applyExpense(paidBy, splits, null);

    res.status(201).json({
      message: 'Direct expense added',
      expense: { paidBy, amount, participants, splits }
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;