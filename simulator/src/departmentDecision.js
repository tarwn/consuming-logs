module.exports = class DepartmentDecision {
    constructor(executableDecisions) {
        this.executableDecisions = executableDecisions || [];
    }

    executeAll(database, producer) {
        if (this.executableDecisions.length > 0) {
            return Promise.all(this.executableDecisions.map(d => d(database, producer)))
                .then(() => {
                    // stamp the database with the latest id that was published - hacky versioning
                    database.setVersion(producer.getLastIdString());
                });
        }
        else {
            return Promise.resolve();
        }
    }

    getActionCount() {
        return this.executableDecisions.length;
    }

    static noAction() {
        return new DepartmentDecision(null);
    }
};
