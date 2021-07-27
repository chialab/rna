/**
 * @typedef {() => Promise<any>} Task
 */

/**
 * Run async jobs concurrently.
 */
export class Queue {
    /**
     * Create a ConcurrentJobs instance.
     */
    constructor() {
        this.count = 1;
        this.total = 0;
        /**
         * @type {Task[]}
         */
        this.todo = [];
        /**
         * @type {Task[]}
         */
        this.running = [];
        /**
         * @type {Task[]}
         */
        this.complete = [];
    }

    /**
     * Add a task to the queue.
     * @param {Task} task The task to run.
     */
    add(task) {
        this.total = this.todo.push(task);
    }

    /**
     * Check if there is a task to run.
     * @private
     * @param {number} count The maximum number of running tasks.
     */
    runNext(count) {
        return (this.running.length < count) && this.todo.length;
    }

    /**
     * Exec the queue
     * @param {number} count The maximum number of running tasks.
     */
    run(count = 1) {
        const promises = [];
        while (this.runNext(count)) {
            const task = /** @type {Task} */ (this.todo.shift());
            const promise = task.call(null);
            promise.then(() => {
                const runningTask = /** @type {Task} */ (this.running[this.running.indexOf(task)]);
                this.complete.push(runningTask);
                return this.run(count);
            });
            promises.push(promise);
            this.running.push(task);
        }

        return Promise.all(promises);
    }
}
