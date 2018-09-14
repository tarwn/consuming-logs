const express = require('express');
const http = require('http');
const socketio = require('socket.io');

module.exports = class Web {
    constructor(config) {
        this._config = config;
        this.clients = [];
    }

    start() {
        this.app = express();
        this.server = http.Server(this.app);
        this.io = socketio(this.server);

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

        this.app.use(express.static(`${__dirname}/web`, {
            index: 'index.html'
        }));

        return new Promise((resolve) => {
            this.server.listen(this._config.webPort, resolve);
        });
    }

    publishEvents(message) {
        if (message.value) {
            const value = JSON.parse(message.value);
            this.clients.forEach((cl) => {
                cl.emit('event', value);
            });
        }
    }
};
