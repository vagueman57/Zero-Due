const express = require('express');    
const app = express();

app.use(express.json());

const usersRouter = require('./routes/users.routes');
const groupRoutes = require('./routes/groups.routes');
const settleRoutes = require('./routes/settle.routes');

app.use('/users', usersRouter);
app.use('/groups', groupRoutes);
app.use('/settle', settleRoutes);

module.exports = app;
