#!/usr/bin/env node
// server.js

// modules
var express = require ('express')
var app = express ()

//process.argv.forEach (function (val, index, array) {
//  console.log (index + ': ' + val);
//});

// Image databases home directory and default album
process.env.IMDB_ROOT = process.argv [2] // album
process.env.IMDB_HOME = process.argv [3] // home

// set our port
var port = process.env.PORT || 3000

// set the static files location
app.use ('/', express.static (__dirname))
app.use ('/', express.static (__dirname + '/public'))

// configure our routes
require ('./app/routes')(app)

// start our app
app.listen (port)

// expose app
exports = module.exports = app

console.log ('\nExpress server, port ' + port + '\n')
