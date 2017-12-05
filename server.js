#!/usr/bin/env nodejs
// server.js

// modules
var express = require ('express')
var app = express ()

//process.argv.forEach(function (val, index, array) {
//  console.log(index + ': ' + val);
//});

// Image database directory
process.env.IMDB_ROOT = process.argv [2]

// set our port
var port = process.env.PORT || 3000

// set the static files location
app.use ('/', express.static (__dirname))
app.use ('/', express.static (__dirname + '/public'))

// configure our routes
require ('./app/routes')(app)

// start our app at http://localhost:3000
app.listen (port)

// expose app
exports = module.exports = app

console.log ('\nExpress server, port ' + port + '\n')
