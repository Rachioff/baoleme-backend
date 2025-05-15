import express, { Router } from 'express'
import { factoryInjection, factoryMethod, injected } from '../util/injection-decorators'

class AppFactory {

    @factoryMethod
    static app(
        @injected('apiRoute') apiRoute: Router,
    ) {
        const app = express()
        app.use('/api', apiRoute)

        return app
    }
    
}

export default factoryInjection(AppFactory)
