// the logic for the web socket server:
"use strict"

var url = "ws://"
if (window.location.protocol == "https:") {
    url = "wss://"
}
url += window.location.host
var ws = undefined
var resultMessage = 'Default'


document.getElementById("connectButton").addEventListener("click", function() {

    document.getElementById("circle").classList.add('green-circle');
    document.getElementById("circle").classList.remove('circle');
    document.getElementById("status-text").innerHTML = "Online!";

    if (ws) {
        uilog("We are already connected.");
        return
    }

    uilog('We set up the web socket connection to "' + url + '"');
    ws = new WebSocket(url);

    //Wird aufgerufen, wenn Verbindung erfolgreich aufgerufen wurde - per Callback Function
    ws.onopen = function() {
        uilog('We are connected to web socket server at ' + url);
        var msg = {
            "info": (new Date()).toString()
        }
        ws.send(JSON.stringify(msg))

    }

    //Wenn eine neue Websocket Nachricht eintrifft
    ws.onmessage = function(evt) {
        uilog("We got message: '" + evt.data + "' from the Node webserver.");
        // Show result (password)
        var resultElem = document.getElementById("result")
        resultMessage = evt.data
        resultElem.innerHTML = resultMessage
    }

    //ws.onerror = function --> Falls ein Fehler auftritt

    //Verbindung wird geschlossen
    ws.onclose = function() {
        ws = undefined
        uilog("Connection is closed.");
    };
});

// Sends md5 hash text data via web socket protocol to the server
document.getElementById("submitHash").addEventListener("click", function() {
    var message = document.getElementById("message").value;
    if (message.length == 32 && ws) {
        uilog("Sending hash data '" + message + "'")
        var msg = {
            "info": message
        }
        ws.send(JSON.stringify(msg))
    } else if (message.length != 32 && ws) {
        alert('Please enter a valid MD5 Hash!')
    } else {
        uilog("We cannot send your Hash, because the Connection is closed. Reconnect first!");
    }
});

// Logging on the User Interface
var logElem = document.getElementById("log")
logElem.innerHTML = "Click the 'Connect' button to connect to the web socket server..."

function uilog(msg) {
    logElem.innerHTML = new Date().toLocaleTimeString() + ": " + msg + "\n" + logElem.innerHTML
}