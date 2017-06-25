#!/usr/bin/env nodejs
// server.js

// modules
var express = require ('express')
var app = express ()

// set our port
var port = process.env.PORT || 3000

// Image database directory - impossible since outside ...
app.use ('/', express.static (__dirname))

// set the static files location 
app.use ('/', express.static (__dirname + '/public'))

// configure our routes
require ('./app/routes')(app)
//IMDB_DIR = 'imdb/'
//console.log (IMDB_DIR)

// start our app at http://localhost:3000
app.listen (port)

// expose app
exports = module.exports = app

console.log ('\nExpress server, port ' + port + '\n')
