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
const passportSocketIo = require("passport.socketio");
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });


app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
    })
);

  //Funtions onAuthorized Success and Fail
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

//Conect to DataBase
myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  console.log("Conected to DB")
  routes(app, myDataBase);
  auth(app, myDataBase);
  let currentUsers = 0;
  io.on('connection', socket => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    socket.on('chat message', message => {
      io.emit('chat message', {
        name: socket.request.user.name,
        message
    })
    console.log('user ' + socket.request.user.username + ' connected');
    socket.on('disconnect', () => {
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
      console.log('user ' + socket.request.user.username + ' disconnected');
});
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

//For FCC testing purposes
fccTesting(app); 
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
