const { normalizeAmount } = require('../utils/math');

class SplitCalculator {

  static validate(totalAmount, participants) {
    if (totalAmount <= 0) throw new Error("Amount must be positive");
    if (!participants || participants.length === 0) {
      throw new Error("At least one participant required");
    }
  }

  /**
   * EQUAL SPLIT with Penny Handling
   */
  static calculateEqualSplit(totalAmount, userIds) {
    this.validate(totalAmount, userIds);

    const count = userIds.length;
    const sortedUserIds = [...userIds].sort();

    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    const totalDistributed = normalizeAmount(baseShare * count);
    let remainder = normalizeAmount(totalAmount - totalDistributed);

    const splits = {};

    for (const userId of sortedUserIds) {
      let amount = baseShare;
      if (remainder > 0) {
        amount = normalizeAmount(amount + 0.01);
        remainder = normalizeAmount(remainder - 0.01);
      }
      splits[userId] = amount;
    }

    return splits;
  }

  /**
   * EXACT SPLIT
   */
  static calculateExactSplit(totalAmount, splitsPayload) {
    let sum = 0;
    const result = {};

    for (const [userId, amount] of Object.entries(splitsPayload)) {
      const normalized = normalizeAmount(amount);
      result[userId] = normalized;
      sum = normalizeAmount(sum + normalized);
    }

    if (sum !== normalizeAmount(totalAmount)) {
      throw new Error("Exact splits do not sum to total");
    }

    return result;
  }

  /**
   * PERCENTAGE SPLIT
   */
  static calculatePercentageSplit(totalAmount, percentageMap) {
    const userIds = Object.keys(percentageMap);
    let totalPercent = 0;

    for (const pct of Object.values(percentageMap)) {
      totalPercent += pct;
    }

    if (totalPercent !== 100) {
      throw new Error("Percentages must sum to 100");
    }

    const result = {};
    let distributed = 0;

    userIds.forEach((userId, index) => {
      if (index === userIds.length - 1) {
        result[userId] = normalizeAmount(totalAmount - distributed);
      } else {
        const amount = normalizeAmount((totalAmount * percentageMap[userId]) / 100);
        result[userId] = amount;
        distributed = normalizeAmount(distributed + amount);
      }
    });

    return result;
  }
}

module.exports = SplitCalculator;
