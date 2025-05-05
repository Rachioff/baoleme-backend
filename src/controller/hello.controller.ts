import { Request, Response } from 'express'
import { ResponseError } from '../util/errors'

export async function hello(req: Request, res: Response) {
    res.json({
        'message': 'Hello World!'
    })
}

export async function teapot(req: Request, res: Response) {
    throw new ResponseError(418, "I'm a teapot")
}