'use strict';
require('dotenv').config();
const routes = require('./routes.js');
const auth = require('./auth.js');

const express = require('express');
const myDB = require('./connection');
const ObjectID = require('mongodb').ObjectID;
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcrypt');
const http = require('http').createServer(app);
const io = require('socket.io')(http);


app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  console.log("Conected to DB")
  routes(app, myDataBase);
  auth(app, myDataBase);
  io.on('connection', socket => {
    console.log('A user has connected');
  });
}).catch(e => {
  console.log("FAILED to conect to DB")
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

// app.listen out here...
http.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + process.env.PORT);
});

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
