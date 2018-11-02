const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { ConsumerGroup } = require('kafka-node');

module.exports = class WebServer {
    constructor(config) {
        this._config = config;
        this.clients = [];
    }

    start() {
        this.app = express();
        this.server = http.Server(this.app);
        this.io = socketio(this.server);

        return this.startWeb()
            .then(() => this.startKafkaConsumer());
    }

    startWeb() {
        this.io.on('connection', (client) => {
            console.log('Client connected...');

            client.on('join', () => {
                this.clients.push(client);
            });

            client.on('disconnect', () => {
                const index = this.clients.findIndex(cl => cl === client);
                if (index !== -1) {
                    this.clients.splice(index, 1);
                }
            });
        });

        this.app.use(express.static(`${__dirname}/dist`, {
            index: 'index.html'
        }));

        return new Promise((resolve) => {
            this.server.listen(this._config.webPort, resolve);
        });
    }

    startKafkaConsumer() {
        const options = {
            kafkaHost: this._config.kafka_host,
            fromOffset: 'earliest',
            groupId: 'webServer-log-group'
        };
        const consumer = new ConsumerGroup(options, [this._config.kafka_topic]);
        // todo: add batching
        consumer.on('message', (message) => {
            if (message.value) {
                const value = JSON.parse(message.value);
                this.clients.forEach((cl) => {
                    cl.emit('event', value);
                });
            }
        });
        consumer.on('error', (error) => {
            console.log(`Error: ${JSON.stringify(error)}`);
        });
    }
};
