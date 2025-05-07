import { Request, Response } from 'express'
import { ResponseError } from '../util/errors'
import { route } from '../util/decorators'

export default class HelloController {

    @route('get', '/hello')
    static async hello(req: Request, res: Response) {
        res.json({
            'message': 'Hello World!'
        })
    }

    @route('get', '/hello/teapot')
    static async teapot(req: Request, res: Response) {
        throw new ResponseError(418, "I'm a teapot")
    }
}
