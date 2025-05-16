import { Logger } from 'pino'
import 'reflect-metadata'

const injectedPropertiesKey = Symbol('injected_properties')
const injectedPropertyKeyNameKey = Symbol('injected_property_key')
const injectedLoggerPropertyKey = Symbol('injected_logger_property')
const factoryMethodKey = Symbol('factory_method')

function defineInjectedMetadata(target: any, propertyKey: string, parameterIndex?: number, key: string = propertyKey, createChildForLogger?: boolean) {
    if (parameterIndex === undefined) {
        // class property
        const existingInjectedProperties: string[] = Reflect.getMetadata(injectedPropertiesKey, target) ?? []
        existingInjectedProperties.push(propertyKey)
        Reflect.defineMetadata(injectedPropertiesKey, existingInjectedProperties, target)
        Reflect.defineMetadata(injectedPropertyKeyNameKey, key, target, propertyKey)
        if (createChildForLogger) {
            Reflect.defineMetadata(injectedLoggerPropertyKey, true, target, propertyKey)
        }
    } else {
        // function parameter
        const existingInjectedParameters: Record<number, string> = Reflect.getMetadata(injectedPropertiesKey, target, propertyKey) ?? {}
        existingInjectedParameters[parameterIndex] = key
        Reflect.defineMetadata(injectedPropertiesKey, existingInjectedParameters, target, propertyKey)
        const existingLoggerParameters: Record<number, boolean> = Reflect.getMetadata(injectedLoggerPropertyKey, target, propertyKey) ?? {}
        existingLoggerParameters[parameterIndex] = createChildForLogger ?? false
        Reflect.defineMetadata(injectedLoggerPropertyKey, existingLoggerParameters, target, propertyKey)
    }
}

export function injected(key: string, createChildForLogger?: boolean): (target: any, propertyKey: string, parameterIndex?: number) => void
export function injected(target: any, propertyKey: string): void
export function injected(...args: any[]) {
    if (typeof args[0] === 'string') {
        return (target: any, propertyKey: string, parameterIndex?: number) => {
            defineInjectedMetadata(target, propertyKey, parameterIndex, args[0], args[1])
        }
    } else {
        const target = args[0]
        const propertyKey = args[1]
        defineInjectedMetadata(target, propertyKey)
    }
}

export function classInjection<T extends { new (...args: any[]): any }>(constructor: T) {
    return class extends constructor {
        constructor(...args: any[]) {
            super(...args)
            const injection = args[0]
            const existingInjectedProperties: string[] = Reflect.getMetadata(injectedPropertiesKey, this) ?? []
            for (const property of existingInjectedProperties) {
                const keyName = Reflect.getMetadata(injectedPropertyKeyNameKey, this, property)
                if (Reflect.hasMetadata(injectedLoggerPropertyKey, this, property)) {
                    const logger = injection[keyName] as Logger
                    (this as any)[property] = logger.child({ class: constructor.name })
                } else {
                    (this as any)[property] = injection[keyName]
                }
            }
        }
    }
}

export function factoryMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(factoryMethodKey, propertyKey, target)
}

export function factoryInjection<T extends { new (...args: any[]): any }>(constructor: T) {
    const fn = Reflect.getMetadata(factoryMethodKey, constructor)
    return (injection: any) => {
        const existingInjectedParameters: Record<number, string> = Reflect.getMetadata(injectedPropertiesKey, constructor, fn) ?? {}
        const existingLoggerParameters: Record<number, boolean> = Reflect.getMetadata(injectedLoggerPropertyKey, constructor, fn) ?? {}
        const args: any[] = []
        for (const index of Object.keys(existingInjectedParameters).map(Number)) {
            const keyName = existingInjectedParameters[index]
            if (existingLoggerParameters[index]) {
                const logger = injection[keyName] as Logger
                args[index] = logger.child({ class: constructor.name })
            } else {
                args[index] = injection[keyName]
            }
        }
        return (constructor as any)[fn](...args)
    }
}