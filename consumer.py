#!/usr/bin/python3

import pika
import hashlib
import os

print("Python-Worker (consumer) Brute-Force cracking pwd hashes...")

url='amqp://lxmkvcva:lcUgTmzJKnpyiVwMKTOcjmXfMzWnfQfs@sparrow.rmq.cloudamqp.com/lxmkvcva'
port=1883
crackqueue = 'cracking'
response = ''

def baseN(num, b=36, numerals="0123456789abcdefghijklmnopqrstuvwxyz"):
    return ((num == 0) and numerals[0]) or (baseN(num // b, b, numerals).lstrip(numerals[0]) + numerals[num % b])


def crack_callback(ch, method, properties, body):
        print("TODO please crack pwd-hash {body}")
        for i in range(36**3):
                current_hash = hashlib.md5(str(baseN(i).zfill(1)).encode()).hexdigest()
                print(f"{baseN(i)} is the current hash {current_hash} == {body} hash ??")
               
                if current_hash == body.decode('utf-8'):
                        print(f"(py) Found Password: {baseN(i)}")
                        response = baseN(i)
                        ch.basic_publish(
                            exchange='', 
                            routing_key=properties.reply_to, 
                            properties=pika.BasicProperties(correlation_id = properties.correlation_id), 
                            body=str(response))
                        ch.basic_ack(delivery_tag=method.delivery_tag)                     
                        break



conn = pika.BlockingConnection(pika.URLParameters(url))
channel = conn.channel()
channel.queue_declare(queue=crackqueue)

channel.basic_consume(queue = crackqueue, on_message_callback=crack_callback)
channel.start_consuming()
conn.close()
print("Done")
