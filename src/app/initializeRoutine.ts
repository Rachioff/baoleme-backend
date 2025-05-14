class InitializeRoutine {
    private queue: (() => void)[] = []
    private asyncQueue: (() => Promise<void>)[] = []

    public addSyncRoutine(fn: () => void) {
        this.queue.push(fn)
    }

    public addAsyncRoutine(fn: () => Promise<void>) {
        this.asyncQueue.push(fn)
    }

    public async run() {
        this.queue.forEach(fn => fn())
        await Promise.all(this.asyncQueue.map(fn => fn()))
    }

}

const initializeRoutine = new InitializeRoutine()
export default initializeRoutine