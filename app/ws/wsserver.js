// the logic for the web socket server:
"use strict"
var clients = []
var mq = require('../mq/mq_producer.js')
var result = 'x';
const {
    Pool
} = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

function startupTheWebSocketServer(app, config) {

    var WebSocketServer = require('websocket').server;
    console.log("   * Web Socket server will be set up in a moment...")
    var wsServer = new WebSocketServer({
        httpServer: app,
    });

    wsServer.getUniqueID = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4();
    };

    var url = "ws://localhost:" + config.server_port
    console.log("   * You might test the web socket server with: wsdump.py " + url + " -vv")

    wsServer.on('request', function(request) {
        pool.connect();
        var connection = request.accept();
        connection.uid = wsServer.getUniqueID();
        clients.push(connection)
        //console.log(connection)
        //let CircularJSON = require('circular-json');
        //console.log("Clients: " + CircularJSON.stringify(clients))
        console.log("   * WebSocketServer-INFO: A client has connected with the unique UID: " + connection.uid)
        console.log("Active Client Connections: " + clients.length)

        var infomsg_to_client = 'Waiting for Hash to be cracked...'
        connection.sendUTF(JSON.stringify(infomsg_to_client));

        connection.on('message', function(message) {

            var rawHash = JSON.stringify(message, ['utf8Data']);

            function getSecondPart(rawHash) {
                return rawHash.split('"')[6];
            }
            var cleanedHash = getSecondPart(rawHash)
            cleanedHash = cleanedHash.slice(0, -1);

            if (cleanedHash.length == 32) {
                console.log("length is 32 und hash ist: " + cleanedHash);

                var query = 'SELECT cracked '
                query += 'FROM password '
                query += 'WHERE hash = $1'
                var value = [cleanedHash]

                // callback
                pool.query('SELECT * FROM password', (err, res) => {
                    if (err) {
                        console.log(err.stack)
                    } else {
                        //console.log(res) to print all rows from table
                    }
                })

                // callback
                pool.query(query, value, (err, res) => {
                    if (err) {
                        console.log("Error while searching the Database: " + err.stack)
                    } else {
                        var resultFromQuery = JSON.stringify(res.rows)
                        if (resultFromQuery.length == 0) {
                            console.log("Found value : " + resultFromQuery)
                        }
                        try {
                            function splitFoundHash(resultFromQuery) {
                                return resultFromQuery.split('":')[1];
                            }
                            var cleanedDatabaseHash = splitFoundHash(resultFromQuery)
                            cleanedDatabaseHash = cleanedDatabaseHash.slice(1, -3);
                            var compareVar = "";
                            console.log("Found Hash in Database:: " + cleanedDatabaseHash)

                        } catch (e) {
                            if (e instanceof TypeError) {
                                console.log("Hash was not found in Databse.")
                            } else {
                                console.log("error: " + e)
                            }
                        } finally {
                            if (cleanedDatabaseHash != compareVar) {
                                compareVar = cleanedDatabaseHash;
                                var databasemsg_to_client = {
                                    "WS-INFO": "Found cracked Hash in Database '" + cleanedDatabaseHash + "'."
                                }
                                console.log(JSON.stringify(databasemsg_to_client))
                                connection.sendUTF(JSON.stringify(databasemsg_to_client));
                                connection.sendUTF(cleanedDatabaseHash);
                            } else {
                                sendMsgToMQ();
                            }
                        }
                    }
                })
            }

            function sendMsgToMQ() {
                console.log("   * WebSocketServer-DEBUG: message received ", message)
                if (message.type === 'utf8') {
                    try {
                        var msg = JSON.parse(message.utf8Data)
                    } catch (err) {
                        var errmsg = "   * WebSocketServer-WARN: We cannot JSON parse message '" + message.utf8Data + "'. Please reformat {'info':'msg'}!";
                        console.log(errmsg);
                        console.info(message.utf8Data);
                        console.info(err);
                        connection.sendUTF(JSON.stringify(errmsg));
                    }
                    console.log("   * WebSocketServer-DEBUG: received '")
                    mq.sendMessageToRabbitMQ(msg.info)

                }

                //Result jede 0.5 Sekunden überprüfen und wenn sich etwas geändert hat, dann zurückschicken
                async function checkIfResultChanged(delay) {
                    if (result != mq.resultPassword) {
                        result = mq.resultPassword
                        var infomsg_to_client = {
                            "WS-INFO": "Thank you for sending information '" + msg.info + "'."
                        }
                        console.log(JSON.stringify(infomsg_to_client) + " Cracked Hash is: " + result)
                        connection.sendUTF(JSON.stringify(infomsg_to_client));
                        connection.sendUTF(result);
                    }
                    setTimeout(() => checkIfResultChanged(delay), delay)
                }
                checkIfResultChanged(500)
            }
        })
        connection.on('error', function(err) {
            console.log("'   * WebSocketServer-ERROR: " + err)
        })
        connection.on('close', function() {
            console.log("   * WebSocketServer-INFO: Connection closed.")
            clients.splice(clients.indexOf(connection), 1) // remove from list
            console.log("Client closed the connection with UID: " + connection.uid)
            console.log("Active Client Connections: " + clients.length)
        })
    })
    wsServer.on('error', function(err) {
        console.log("WebServer Error: '" + err + "'")
    })
    //Handle UnhandledPromiseRejectionWarnings from PostgresSQL connect(), if there are more than 20 clients connected
    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', reason.stack);
    });
}

// export name "startup"
module.exports.startup = startupTheWebSocketServer