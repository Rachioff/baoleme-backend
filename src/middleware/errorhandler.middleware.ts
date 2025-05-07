import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export async function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (typeof(err.status) === 'number' && typeof(err.message) === 'string') {
        res.status(err.status).json({ message: err.message })
    } else if (err.error instanceof Joi.ValidationError) {
        res.status(400).json({ message: 'Invalid request' })
    } else {
        next(err)
    }
}