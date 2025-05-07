import { IRouter, Router } from 'express'
import 'reflect-metadata'
import { Schema } from 'joi'

import passport from '../config/passport'
import { createValidator, ExpressJoiInstance } from 'express-joi-validation'


const routerMetadataKey = Symbol('router')
const middlewareMetadataKey = Symbol('middleware')
const validator = createValidator({ passError: true })

function getMiddlewares(target: any, key: string) {
    return (Reflect.getMetadata(middlewareMetadataKey, target, key) ?? []) as any[]
}

export function route(
    method: 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head',
    path: string,
) {
    return (target: any, key: string, descriptor: PropertyDescriptor) => {
        const router = getRouter(target)
        const middlewares = getMiddlewares(target, key)
        router[method](path, ...middlewares, descriptor.value)
    }
}

export function requireAuth(target: any, key: string) {
    const middlewares = getMiddlewares(target, key)
    middlewares.push(passport.authenticate('jwt', { session: false, failWithError: true }))
    Reflect.defineMetadata(middlewareMetadataKey, middlewares, target, key)
}

export function validate(
    validateTarget: keyof ExpressJoiInstance,
    schema: Schema
) {
    return (target: any, key: string) => {
        const middlewares = getMiddlewares(target, key)
        middlewares.push(validator[validateTarget](schema))
        Reflect.defineMetadata(middlewareMetadataKey, middlewares, target, key)
    }
}

export function getRouter(target: any) {
    let r = Reflect.getMetadata(routerMetadataKey, target) as IRouter | null
    if (!r) {
        Reflect.defineMetadata(routerMetadataKey, r = Router(), target)
    }
    return r
}