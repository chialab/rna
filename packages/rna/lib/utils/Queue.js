/**
 * @typedef {() => Promise<any>} Task
 */

/**
 * Run async jobs concurrently.
 */
export class Queue {
    total = 0;

    /**
     * @type {Task[]}
     */
    tasks = [];

    /**
     * @type {Task[]}
     */
    running = [];

    /**
     * @type {Task[]}
     */
    todo = [];

    /**
     * @type {Task[]}
     */
    complete = [];

    /**
     * Add a task to the queue.
     * @param {Task} task The task to run.
     */
    add(task) {
        this.total = this.tasks.push(task);
    }

    /**
     * Check if there is a task to run.
     * @private
     * @param {number} count The maximum number of running tasks.
     */
    runNext(count) {
        return this.running.length < count && this.todo.length;
    }

    /**
     * Exec the queue
     * @param {number} count The maximum number of running tasks.
     * @param {any[]} [results] List of results.
     * @returns A list of queue results.
     */
    async run(count = 1, results = undefined) {
        const promises = [];

        let runResults = results;
        if (!runResults) {
            // main request
            runResults = [];
            this.todo = this.tasks.slice(0);
            this.running = [];
            this.complete = [];
        }

        while (this.runNext(count)) {
            const task = /** @type {Task} */ (this.todo.shift());
            const promise = task.call(null);
            promises.push(
                promise.then((result) => {
                    if (runResults) {
                        runResults[this.tasks.indexOf(task)] = result;
                    }
                    const io = this.running.indexOf(task);
                    const runningTask = /** @type {Task} */ (this.running[io]);
                    this.running.splice(io, 1);
                    this.complete.push(runningTask);
                    return this.run(count, runResults);
                })
            );
            this.running.push(task);
        }

        await Promise.all(promises);

        return runResults;
    }
}
