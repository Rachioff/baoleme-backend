import { Router } from 'express'
import { ResponseError } from '../util/errors'
import { factoryInjection, factoryMethod } from '../util/injection-decorators'

class HelloController {

    @factoryMethod
    static helloController() {
        const router = Router()

        router.get(
            '/hello',
            async (req, res) => {
                res.json({ 'message': 'Hello World!' })
            }
        )

        router.get(
            '/hello/teapot',
            async (req, res) => {
                throw new ResponseError(418, "I'm a teapot")
            }
        )

        return router
    }

}

export default factoryInjection(HelloController)
