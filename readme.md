🌲 Hello Developers, let's play with Logs!
===========================================

Have you heard of [Apache Kafka](https://kafka.apache.org/)?  [AWS Kinesis](https://aws.amazon.com/kinesis/)? [Azure EventHubs](https://azure.microsoft.com/en-us/services/event-hubs/)?

There's no one true way to build software, so when we go to build or 
evolve a system we tend to either stick to patterns we haven't used
yet (safe!) or try new things (we have to start somewhere!).

The intent of this project is to build just enough of a simulation 
that we can build exercises to try out different patterns for
consuming events on something larger than a Hello World app but
less dangerous than Production.

Current State - Not Ready Yet
==================================

The simulation is coming along, but still needs some front-end
pieces before we get into writing exercises and more detailed
usage instructions.

Some sample exercises:

* Build a realtime warehouse shipping view
* Build a realtime revenue report
* Email alerts when a production order is complete
* Build an anonymized planning view customers could see
* Track (and present) aggregate production data
* And more...

Instructions
=====================

1. Download or `git clone` this repository
2. Follow the Setup below
3. Run the simulation with exercise 1: `npm run all 1`
4. Open up [Exercise 1](./Exercises/Exercise1.md), make your own project in the language of your choice, and get started!

Setup
---------------------

1. Run `docker-compose up`
2. _If you're on windows and using older docker on virtualbox: ...something..._
3. Open http://localhost:9000 to open the admin interface (use the env ip if this doesn't resolve)
4. In admin: 
    A. "Add Cluster", Kafka Version >= 0.9.0.1

Running Simulation
----------------------

Currently only supports a basic config, numbered scenarios
in the future.

`npm run all`

Tests (if you customize it)
----------------------------

* Run tests like a caveman: `npm test`
* Run tests like magic:
    * Install [wallaby](https://wallabyjs.com/)
    * Watch wallaby run like magic...

_Note: Jest configs need to be present in /web/package.json and /package.json to llow local and wallaby tests to run_

Tech So Far
======================

* [kafka-node on github](https://github.com/SOHU-Co/kafka-node)
* [setup blog post for Windows](https://zablo.net/blog/post/setup-apache-kafka-in-docker-on-windows)

