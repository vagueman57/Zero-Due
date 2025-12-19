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

module.exports = router;
