#!/usr/bin/env node

console.log("Javascript-Worker (consumer) Brute-Force cracking pwd hashes...");

const CONN_URL = 'lxmkvcva:lcUgTmzJKnpyiVwMKTOcjmXfMzWnfQfs@sparrow.rmq.cloudamqp.com/lxmkvcva';
var crackqueue = 'cracking';
var response = '';
var crypto = require("crypto-js");

//Erstellt alle Möglichten Kombinationen
function allPossibleCombinations(input, length, curstr) {
    if(curstr.length == length) return [ curstr ];
    var ret = [];
    for(var i = 0; i < input.length; i++) {
        ret.push.apply(ret, allPossibleCombinations(input, length, curstr + input[i]));
    }
    return ret;
}

var all = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']

var amqp = require('amqplib/callback_api');
//Verbindung zu RabbitMQ Herstellen
amqp.connect('amqp://' + CONN_URL, function(error0, connection) {
  if (error0) {
    throw error0;
  }
  //Channel Erstellen
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = crackqueue;

    //Queue dem Channel zuweisen
    channel.assertQueue(queue, {
      durable: false
    });
    //Auf Message warten
    channel.consume(queue, function reply(msg) {
      var hash = msg.content.toString();
      console.log(" [.] hash(%d)", hash);
    
      //Alle Möglichkeiten erstelllen (1,2 und 3 Stellig)
      var combinationsWithOne = allPossibleCombinations(all,1,'')
      var combinationsWithTwo = allPossibleCombinations(all,2,'')
      var combinationsWithThree = allPossibleCombinations(all,3,'')
      
      var savedCombinations = []
      //in ein Array zusammenfügen
      savedCombinations.push(...combinationsWithOne, ...combinationsWithTwo, ...combinationsWithThree)
  
      //Eine Schleife über das Array laufen lassen und schauen, ob Hash der an der Stelle von i ist
	for(var i = 0; i<=savedCombinations.length; i++){
		var current_hash = crypto.MD5(savedCombinations[i]);
		console.log(savedCombinations[i] + " is the current hash: " + current_hash + " == " + hash + " hash ??");
    //Bei Übereinstimmung, den Wert in response speichern
    if (current_hash == hash){
			console.log("(js) Found password: " + savedCombinations[i]);
      response = (""+savedCombinations[i]);
      //über den Channel zurückschicken
			channel.sendToQueue(msg.properties.replyTo,
				Buffer.from(response), {
					correlationId: msg.properties.correlationId
				});
			channel.ack(msg);
			break;
		}
	}
    });
  });
});
