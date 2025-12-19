// Centralized money normalization
const normalizeAmount = (amount) => {
  return Math.round(amount * 100) / 100;
};

module.exports = { normalizeAmount };
