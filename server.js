"use strict"

// node server.js <PORT> <ADDRESS>
var PORT = process.env.PORT || 5000
var SERVER_ADDRESS = '0.0.0.0'
console.log("Process execution Path: " + process.argv[0])
console.log("Path for JS File: " + process.argv[1])
//process.argv returns array containing the command-line arguments passed when the Node.js process was launched
console.log(process.argv)
if (process.argv.length >= 3) {
    PORT = process.argv[2];
}
if (process.argv.length >= 4) {
    SERVER_ADDRESS = process.argv[3];
}
console.log("Webfrontend: Node JS is starting up at " + SERVER_ADDRESS + ":" + PORT + "...")
console.log(" check out 'curl http://" + SERVER_ADDRESS + ":" + PORT + "/'  or just 'open http://" + SERVER_ADDRESS + ":" + PORT + "/' in your browser to allow a web page to talk via web sockets...'")

var frontend = require('./app/main.js')

frontend.startup({
    "server_address": SERVER_ADDRESS,
    "server_port": PORT,
    staticdir: "public"
})