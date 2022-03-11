#!/usr/bin/env python3
import pika
import os
import psycopg2


DATABASE_URL = os.environ['DATABASE_URL']
url='amqp://lxmkvcva:lcUgTmzJKnpyiVwMKTOcjmXfMzWnfQfs@sparrow.rmq.cloudamqp.com/lxmkvcva'
storagequeue = 'storage2'
response = ''

print("[DB-Worker]Worker (consumer) storing information to database")

if not os.path.isfile(DATABASE_URL):
    print("[DB-Worker]Database does not exist, creating now")
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS password")
    sql ='''CREATE TABLE password(
        id SERIAL PRIMARY KEY,
        hash VARCHAR UNIQUE,
        cracked VARCHAR
        )'''
    cursor.execute(sql)
    print("Table created successfully........")
    conn.commit()
    conn.close()
else:
    print("[DB-Worker]Database already exists")


def storage_callback(ch, method, properties, body):
    print(f"[DB-Worker]Attempting to save {body}")
    message = body.decode('UTF-8')
    list = message.split(',')
    hash = list[0]
    cracked = list[1]
    print(f"[DB-Worker]] hash is {hash}, cracked pw is {cracked}")
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO password (hash, cracked) VALUES(%s, %s) ON CONFLICT DO NOTHING", (hash, cracked))
    conn.commit()
    cursor.execute("SELECT * FROM password")
    print("Database: ")
    print(cursor.fetchall())
    conn.commit()
    
    ch.basic_publish(
        exchange='', 
        routing_key=properties.reply_to, 
        properties=pika.BasicProperties(correlation_id = properties.correlation_id), 
        body=str('Successful storage'))
    ch.basic_ack(delivery_tag=method.delivery_tag)

    cursor.close()
    conn.close()
    print(f"[DB-Worker]Committed to database")
        
conn = pika.BlockingConnection(pika.URLParameters(url))
channel = conn.channel()
channel.queue_declare(queue=storagequeue)
channel.basic_consume(queue =storagequeue, on_message_callback=storage_callback)
channel.start_consuming()
conn.close()
print("Done")