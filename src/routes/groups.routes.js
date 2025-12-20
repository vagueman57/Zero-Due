const express = require('express');
const router = express.Router();
const store = require('../data/store');

const SplitCalculator = require('../services/splitCalculator');
const { applyExpense } = require('../services/balanceService');

 // Create a group
router.post('/', (req, res) => {
  const { id, name, members } = req.body;

  if (!id || !name || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'Invalid group payload' });
  }

  if (store.groups[id]) {
    return res.status(409).json({ error: 'Group already exists' });
  }

  // Validate users exist
  for (const userId of members) {
    if (!store.users[userId]) {
      return res.status(400).json({ error: `User ${userId} does not exist` });
    }
  }

  // Initialize group-specific ledger
  if (!store.groupBalances[id]) {
    store.groupBalances[id] = {};
  }

  store.groups[id] = {
    id,
    name,
    members
  };
  res.status(201).json(store.groups[id]);
});

// Add Expense (The Core Logic) 
router.post('/:groupId/expenses', (req, res) => {
  const { groupId } = req.params;
  const { paidBy, amount, splitType, splitDetails } = req.body;

  // A. Validate Group & Payer
  const group = store.groups[groupId];
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group.members.includes(paidBy)) {
    return res.status(400).json({ error: 'Payer must be a member of the group' });
  }

  let splits;

  try {
    // B. Calculate Splits (Delegating to the Math Service)
    switch (splitType) {
      case 'EQUAL':
        // For EQUAL, splitDetails is just the list of involved users (or all members)
        // If splitDetails is empty, we assume everyone in the group splits it
        const involvedUsers = (splitDetails && splitDetails.length > 0) ? splitDetails : group.members;
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

    // C. Update Ledger (Delegating to the Balance Service) - NOW SCOPED TO GROUP
    applyExpense(paidBy, splits, groupId);

    res.status(201).json({
      message: 'Expense added',
      expense: { paidBy, amount, splits }
    });

  } catch (err) {
    // Catch validation errors from the SplitCalculator (e.g., "Percentages must equal 100")
    res.status(400).json({ error: err.message });
  }
});

// Get Balances (Per-Group View)
router.get('/:groupId/balances', (req, res) => {
  const { groupId } = req.params;
  const group = store.groups[groupId];
  
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  // Return ledger specific to this group
  const groupBalances = store.groupBalances[groupId] || {};
  
  res.json(groupBalances);
});

module.exports = router;