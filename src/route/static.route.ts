import express, { Router } from 'express'
import { factoryInjection, factoryMethod } from '../util/injection-decorators'

class StaticRoute {

    @factoryMethod
    static staticRoute() {
        const router = Router()

        router.use(express.static(process.env.STATIC_ROOT!))

        return router
    }

}

export default factoryInjection(StaticRoute)
