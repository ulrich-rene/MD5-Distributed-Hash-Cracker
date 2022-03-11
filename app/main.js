"use strict"

var http = require("http");
var fs = require('fs')
var wsserver = require('./ws/wsserver.js')
var siteNotFound = fs.readFileSync("./public/404.html", "utf-8");

var exec = require('child_process').exec;

//set maxBuffer option when using child_process.exec
var execute = function(command, callback) {
    exec(command, {
        maxBuffer: 1024 * 100000
    }, function(error, stdout, stderr) {
        callback(error, stdout);
    });
};

var startup = function(config) {

    // this callback 
    // will return SOME static files 
    // (with proper content type)
    function callback(request, response) {

        var parseClientIp = (request.headers['x-forwarded-for'] || '').split(',').pop().trim() || 
        request.connection.remoteAddress || 
        request.socket.remoteAddress || 
        request.connection.socket.remoteAddress

        console.log("New requested url by the client with IP " + parseClientIp + ": '" + request.url + "'");
        if (request.url == "/") {
            request.url = "/index.html"
        }

        var suffix = request.url.split(".").pop()
        var contenttype = "text/plain"
        switch (suffix) {
            case "html":
                contenttype = "text/html";
                break;
            case "js":
                contenttype = "application/javascript";
                break;
            case "css":
                contenttype = "text/css";
                break;
            case "woff@<version>":
                contenttype = "font/woff";
                break;
            case "woff2":
                contenttype = "font/woff2";
                break;
            case "ttf":
                contenttype = "font/ttf";
                break;
            default:
                contenttype = "text/plain";
                break;
        }

        var filename = config.staticdir + request.url
        fs.readFile(filename, function(err, data) {
            if (err) {
                //Noch such File or Directory
                if (err.code == 'ENOENT') {
                    fs.readFile(siteNotFound, function(err) {
                        response.writeHead(404, "File or Directory was not found", {
                            "content-type": "text/html; charset=utf-8"
                        });
                        response.end(siteNotFound);
                    });
                } else {
                    response.writeHead(500);
                    response.end('Sorry, check with the site admin for error: ' + err.code + ' ..\n');
                }
            } else {
                response.setHeader('Cache-Control', 'public, max-age=31536000');
                response.writeHead(200, "OK Node", {
                    "content-type": contenttype + "; charset=utf-8"
                }, 'Cache-Control:public', 'max-age=31536000');
                response.end(data)
            }
        });

    }

    var server = http.createServer(callback).listen(config.server_port, config.server_address);
    console.log("The Webserver is now running on host '" + config.server_address + "' on port '" + config.server_port + "'...");
    

    // web socket server:
    wsserver.startup(server, config)

    let {
        PythonShell
    } = require("python-shell");

    let options = {
        scriptPath: './'
    };

    PythonShell.run("consumer.py", options, function(err) {
        if (err) throw err;
        console.log("finished");
    });

  /*  execute('./consumer.js', function(error, stdout, stderr) {
        console.log(`${stdout}`);
        console.log(`${stderr}`);
        if (error !== null) {
            console.log(`exec error: ${error}`);
        }
    })*/

    let child = require('child_process').execFile('./consumer.js', { 
        // detachment and ignored stdin are the key here: 
        detached: true, 
        stdio: [ 'ignore', 1, 2 ]
    }); 
    // and unref() somehow disentangles the child's event loop from the parent's: 
    child.unref(); 
    child.stdout.on('data', function(data) {
        console.log(data.toString()); 
    });    

}
module.exports.startup = startup
