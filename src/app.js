const express = require('express');    
const app = express();

app.use(express.json());

const usersRouter = require('./routes/users.routes');
const groupRoutes = require('./routes/groups.routes');


app.use('/users', usersRouter);
app.use('/groups', groupRoutes);

module.exports = app;
