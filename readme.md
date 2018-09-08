🌲 Hello Developers, let's play with Logs!
===========================================

Have you heard of [Apache Kafka](https://kafka.apache.org/)?  [AWS Kinesis](https://aws.amazon.com/kinesis/)? [Azure EventHubs](https://azure.microsoft.com/en-us/services/event-hubs/)?

No?
----

If not, consider for a moment that CRUD app you have that does
tries to save a record, update a report, send an email, call
an API endpoint on another system, 🔥🔥🔥🔥...

Instead of trying to put everything into one big Save()
call, what if you could broadcast a log of every action
that happened in your application and let the rest of those
things take care of themselves. They could be seperate apps, 
they could run only during special hours, they could re-run the 
whole day over from 2AM if you find and fix a bug at 3PM.

Yeah 🦄🌈⛳

Cool, so I should try it in production?
----------------------------------------

Whoah there... 🤠

Yeah, it can be hard to really learn these things without 
building something, but that's where we come in.

[Whatever This Things Name Is] is a simulation of a manufacturing
system that produces events as 🤝 Sales closes new orders, 🚚 Purchasing 
buys raw materials, ⚙ Production makes orders, 🚛 Warehouse ships the orders, 
and 💰Finance makes sure all the money flows.

There are [an impressive number] of Exercises, so you can get your
hands around code that takes advantage of consuming these events from
an event log.

Let's get started!
=====================

1. Download or `git clone` this repository
2. Follow the Setup below
3. Run the simulation with exercise 1: `npm run simulation 1`
4. Open up [Exercise 1](./Exercises/Exercise1.md), make your own project in the language of your choice, and get started!

Setup
---------------------

1. Run `docker-compose up`
2. _If you're on windows and using older docker on virtualbox: ...something..._
3. Open http://localhost:9000 to open the admin interface (use the env ip if this doesn't resolve)
4. In admin: 
    A. "Add Cluster", Kafka Version >= 0.9.0.1

Tests
-----------------------

* Run tests like a caveman: `npm test`
* Run tests like magic:
    * Install [wallaby](https://wallabyjs.com/)
    * Watch wallaby run like magic...

Running Simulation
----------------------

Currently only supports a basic config, numbered scenarios
in the future.

`npm run simulation`


Useful References
======================

* [kafka-node on github](https://github.com/SOHU-Co/kafka-node)
* [setup blog post for Windows](https://zablo.net/blog/post/setup-apache-kafka-in-docker-on-windows)

