import * as awilix from 'awilix'

class AsyncInitializeRoutine {
    private initializers: (() => Promise<void>)[] = []

    addInitializer(initializer: () => Promise<void>) {
        this.initializers.push(initializer)
    }

    async initialize() {
        for (const initializer of this.initializers) {
            await initializer()
        }
    }
}

export const asyncInitializeRoutine = new AsyncInitializeRoutine()

export const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY,
    strict: true,
})

container.loadModules(['out/**/*.js'], {
    formatName: 'camelCase'
})
