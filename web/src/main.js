const Vue = require('vue');
const App = require('./app.vue');
const EventStore = require('./events/eventStore').default; // srsly o_O ??

Vue.config.productionTip = false;

// Event Store
const eventStore = new EventStore();

// socket
const socket = io.connect('http://localhost:8082');
socket.on('connect', (data) => {
    socket.emit('join', 'Hello World from client');
    console.log(data);
});
socket.on('event', (event) => {
    eventStore.addEvents([event]);
});

/* eslint-disable-next-line no-new */
new Vue({
    el: '#app',
    // template: '<App :eventStore="eventStore" />',
    // components: { App },
    render: (createElement) => {
        return createElement(App, {
            props: {
                eventStore
            }
        });
    },
    data: {
        eventStore
    }
});
