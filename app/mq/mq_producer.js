var amqp = require('amqplib/callback_api');
const CONN_URL = 'amqps://lxmkvcva:lcUgTmzJKnpyiVwMKTOcjmXfMzWnfQfs@sparrow.rmq.cloudamqp.com/lxmkvcva';

var serverurl = CONN_URL.split(/@(.+)/)[1];

var queue = "cracking"
var storagequeue = "storage2"
var resultPassword = 'cracking...'
var resultDatabase = 'waiting for storage...'

function send(hash) {
  //Connect to RabbitMQ Server
    amqp.connect(CONN_URL, function(err, conn) {
        if (hash.length != 32) {
            return
        }

        if (err) {
            throw err;
        }
        console.log(" [.] Connected to CloudAMQP Server: " + serverurl)
        //Next we create a channel, which is where most of the API for getting things done resides
        conn.createChannel(function(errCh, ch) {
            if (errCh) {
                throw errCh;
            }

            console.log(" [.] Channel1 ok");
            var data = Buffer.from(hash)
            //To send, we must declare a queue for us to send to; then we can publish a message to the queue:
            ch.assertQueue('', {
                exclusive: true
            }, function(error2, q) {
                if (error2) {
                    throw error2;
                }
                var correlationId = generateUuid();

                //We start with the consuming of our channel from our queue
                ch.consume(q.queue, function(msg) {
                    if (msg.properties.correlationId == correlationId) {
                        console.log(' [.] Got Password: %s', msg.content.toString());
                        resultPassword = msg.content.toString()

                        // Create Storage channel
                        conn.createChannel(function(errCh, ch2) {
                            console.log(" [.] Channel2 ok")
                            if (errCh) {
                                throw errCh;
                            }
                            //declare new queue for storage
                            ch2.assertQueue('', {
                                exclusive: true
                            }, function(error2, q) {
                                if (error2) {
                                    throw error2;
                                }
                                var correlationId = generateUuid();
                                ch2.consume(q.queue, function(msg) {
                                    if (msg.properties.correlationId == correlationId) {
                                        console.log(' [.] Got Message from Storage: %s', msg.content);
                                        resultDatabase = msg.content.toString();
                                        setTimeout(function() {}, 20000);
                                    }
                                }, {
                                    noAck: true
                                });
                                myObject2 = {
                                    correlationId: correlationId,
                                    replyTo: q.queue
                                }
                                dataStorage = Buffer.from(hash + ',' + resultPassword)
                                ch2.sendToQueue(storagequeue, dataStorage, myObject2);
                            })
                        })

                        setTimeout(function() {
                            conn.close();
                        }, 25000);
                    }
                }, {
                    noAck: true
                });
                myObject = {
                    correlationId: correlationId,
                    replyTo: q.queue
                }
                ch.sendToQueue(queue, data, myObject);
                console.log(" [.] Send data: '" + hash + "'");
            });
            setTimeout(function() {
                conn.close();
            }, 25000);
        });
    })
}

function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

module.exports = {
    sendMessageToRabbitMQ: send,
    get resultDatabase() {
        return resultDatabase
    },
    set resultDatabase(value) {
        resultDatabase = value
    },
    get resultPassword() {
        return resultPassword
    },
    set resultPassword(value) {
        resultPassword = value
    }
}