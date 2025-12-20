
# Project Title

A brief description of what this project does and who it's for

# Expense Sharing Backend - Design Document

A simplified Splitwise-like expense sharing application backend built with Node.js and Express.

---

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Architecture & Design](#architecture--design)
- [Core Algorithms](#core-algorithms)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)

---

## Quick Start

### Installation & Running
```bash
npm install
npm start        # Production (port 3000)
npm run dev      # Development with hot reload
npm test         # Run tests
```

**Note**: All data is in-memory and resets on restart.

---

## Architecture & Design

### Project Structure
```
src/
├── app.js                    # Express app configuration
├── server.js                 # Server entry point
├── data/store.js             # In-memory data store
├── routes/                   # API endpoints
│   ├── users.routes.js
│   ├── groups.routes.js
│   └── settle.routes.js
├── services/                 # Business logic
│   ├── splitCalculator.js   # Split calculation logic
│   ├── simplifier.js        # Balance simplification algorithm
│   └── balanceService.js    # Balance & ledger operations
└── utils/math.js             # Precision utilities
```

### Data Model

```javascript
{
  users: { "u1": { id: "u1", name: "Alice" } },
  groups: { "g1": { id: "g1", name: "Trip", members: ["u1", "u2"] } },
  balances: { "u1": { "u2": 50.00 } }  // u1 owes u2 $50
}
```

**Ledger Invariants**:
- **Unidirectional**: Only one direction per pair (no duplicate entries)
- **No Zero Entries**: Balances of 0 are removed
- **Simplification Scope**: By default, simplification runs after settlements; expenses keep raw ledgers for transparency. You can enable simplification after expenses in `applyExpense()` if desired.
- **Normalized**: All amounts rounded to 2 decimals

---

## Core Algorithms

### 1. Split Calculation ([`src/services/splitCalculator.js`](src/services/splitCalculator.js ))

#### Equal Split - The Penny Problem
**Challenge**: $100 ÷ 3 = 33.33 + 33.33 + 33.33 = 99.99 ❌

**Solution**:
```javascript
// 1. Base share: floor(100/3 * 100) / 100 = 33.33
// 2. Remainder: 100 - (33.33 * 3) = 0.01
// 3. Assign remainder to first user alphabetically (deterministic)
// Result: { a: 33.34, b: 33.33, c: 33.33 } ✓
```

**Time Complexity**: O(n log n) - sorting ensures deterministic results

#### Exact Split
Validates that provided amounts sum exactly to total.

#### Percentage Split
Assigns last participant the remaining amount to ensure exact total and avoid rounding drift.

---

### 2. Balance Simplification (`simplifier.js`)

#### The Problem
Without simplification:
- Alice pays $30 for Bob → Bob owes Alice $30
- Bob pays $30 for Charlie → Charlie owes Bob $30  
- Charlie pays $30 for Alice → Alice owes Charlie $30

Creates 3 transactions when all debts cancel out.

#### Algorithm: Net Balance Greedy Matching

**Steps**:

1. **Compute Net Flow** - O(E)
   ```javascript
   Input: { A: { B: 10 }, B: { C: 10 } }
   Net:   { A: -10, B: 0, C: +10 }
   ```

2. **Separate & Sort** - O(N log N)
   ```javascript
   Debtors:   [{ user: A, amount: 10 }]  // sorted descending
   Creditors: [{ user: C, amount: 10 }]
   ```

3. **Match & Settle** - O(N)
   ```javascript
   // Match largest debtor with largest creditor
   Result: { A: { C: 10 } }  // Direct transaction
   ```

**Overall Complexity**: O(N log N)

**Example - Circular Debt Elimination**:
```javascript
Input:  { A: { B: 10 }, B: { C: 10 }, C: { A: 10 } }
Output: {}  // All debts cancel out!
```

---

### 3. Precision Handling (`math.js`)

**Challenge**: JavaScript floating-point arithmetic
```javascript
0.1 + 0.2 === 0.30000000000000004  // ❌
```

**Solution**:
```javascript
const normalizeAmount = (amount) => Math.round(amount * 100) / 100;
```

Applied everywhere: splits, balances, settlements, simplification.

**Epsilon Threshold**: 0.009 - ignores "dust" amounts during simplification.

---

## API Reference

Base: `http://localhost:3000`

### Users

**Create User**
```http
POST /users
{ "id": "u1", "name": "Alice" }
```

**Get User Balances**
```http
GET /users/:userId/balances

Response (simplified, aggregated across global + all groups):
{
  "user": "u1",
  "owes": { "u2": 50.00 }
}
```

### Groups

**Create Group**
```http
POST /groups
{ "id": "g1", "name": "Trip", "members": ["u1", "u2", "u3"] }
```

**Add Expense - Equal Split**
```http
POST /groups/:groupId/expenses
{ "paidBy": "u1", "amount": 100, "splitType": "EQUAL" }
```

**Add Expense - Exact Split**
```http
POST /groups/:groupId/expenses
{
  "paidBy": "u1",
  "amount": 100,
  "splitType": "EXACT",
  "splitDetails": { "u1": 40, "u2": 30, "u3": 30 }
}
```

**Add Expense - Percentage Split**
```http
POST /groups/:groupId/expenses
{
  "paidBy": "u1",
  "amount": 100,
  "splitType": "PERCENTAGE",
  "splitDetails": { "u1": 40, "u2": 30, "u3": 30 }
}
```

**Get Group Balances**
```http
GET /groups/:groupId/balances
```

### Settlements

**Record Payment**
```http
POST /settle
{ "from": "u2", "to": "u1", "amount": 33.33 }
```

**Add Global/Non-Group Expense**
```http
POST /settle/expense
{
  "paidBy": "u1",
  "amount": 120,
  "participants": ["u1", "u2", "u3"],
  "splitType": "EQUAL" | "EXACT" | "PERCENTAGE",
  "splitDetails":  // optional for EQUAL; required for EXACT/PERCENTAGE
    // EQUAL: ["u1","u2"] to split among subset (defaults to all participants)
    // EXACT: { "u1": 40, "u2": 40, "u3": 40 }
    // PERCENTAGE: { "u1": 40, "u2": 30, "u3": 30 }
}

Response:
{
  "message": "Direct expense added",
  "expense": { "paidBy": "u1", "amount": 120, "participants": ["u1","u2","u3"], "splits": { /* computed */ } }
}

---
```
## Design Decisions

### 1. In-Memory Storage
**Why**: Simplifies assignment, no database setup.  
**Trade-off**: Data lost on restart.  
**Future**: Easy to swap with Redis/PostgreSQL.

### 2. Automatic Balance Simplification
**Why**: Minimizes transactions users need to make.  
**When**: After settlements by default. Group/global expenses retain raw ledgers to keep history visible; you can enable simplification in `balanceService.applyExpense()` if you prefer minimal transactions immediately after expenses.  
**Cost**: O(N log N) - acceptable for typical groups.

### 3. Unidirectional Ledger
**Why**: Single source of truth, no conflicting entries.  
**Benefit**: Prevents "A owes B $10 AND B owes A $5" confusion.

### 4. EQUAL Split Behavior
**Decision**: Always divides among all group members.  
**Alternative**: Could support subset via optional `splitDetails`.

### 5. Error Handling Strategy
- Route level: Request validation
- Service level: Business logic validation
- Descriptive error messages

### 6. Separation of Concerns
- **Routes**: Validation & response formatting
- **Services**: Business logic & calculations
- **Utils**: Reusable utilities
- **Data**: Storage abstraction

---

## Testing

Run tests: [`npm test`](tests/simplifier.test.js )

**Coverage Highlights**:
- ✓ Equal split penny problem & deterministic distribution
- ✓ Exact/percentage split validation
- ✓ Transitive debt removal
- ✓ Circular debt elimination
- ✓ Complex multi-party scenarios

**Manual Test Example**:
```bash
# Create users
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"id":"alice","name":"Alice"}'

# Create group
curl -X POST http://localhost:3000/groups \
  -H "Content-Type: application/json" \
  -d '{"id":"trip","name":"Trip","members":["alice","bob","charlie"]}'

# Add expense
curl -X POST http://localhost:3000/groups/trip/expenses \
  -H "Content-Type: application/json" \
  -d '{"paidBy":"alice","amount":90,"splitType":"EQUAL"}'

# Check balances
curl http://localhost:3000/groups/trip/balances

# Add a global expense (non-group)
curl -X POST http://localhost:3000/settle/expense \
  -H "Content-Type: application/json" \
  -d '{"paidBy":"alice","amount":60,"participants":["alice","bob","charlie"],"splitType":"EQUAL"}'

# View a user's simplified aggregated balances
curl http://localhost:3000/users/alice/balances
```

---

## Key Insights

1. **Floating-point precision** is critical - without normalization, balances drift
2. **Simplification is essential** - complex histories need minimal settlements
3. **Penny problem** always occurs with equal splits - must handle deterministically
4. **Validation prevents corruption** - bad data can break entire balance state
5. **Edge cases matter** - circular debts and zero balances reveal design flaws

---

## Future Enhancements

- Persistent storage (PostgreSQL)
- Authentication & authorization
- Expense categories & tags
- Multi-currency support
- Receipt image uploads
- Advanced simplification (min-cost flow)

---

## Submission

**Author**: Rajiv  
**Date**: December 20, 2025  
**Assignment**: CredResolve - Expense Sharing Application

---

## License

MIT