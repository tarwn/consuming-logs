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
* [setup blog post](https://zablo.net/blog/post/setup-apache-kafka-in-docker-on-windows)

