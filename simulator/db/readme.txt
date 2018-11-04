This is a placehold to ensure the directory gets rceated.

This directory will house the leveldb(s) used by the simulator during runs.
Each database will be named the same as the kafka topic events are
published on, so that the contents of the topic will always map to the
state stored in the database (though the kafka retention setting means
the log events may not be able to reproduce 100% of the state).
