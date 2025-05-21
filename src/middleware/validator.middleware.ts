import { NextFunction, Request, Response } from 'express'
import { createValidator } from 'express-joi-validation'
import { Schema } from 'joi'
import { ResponseError } from '../util/errors'
import Joi from 'joi'
import sharp from 'sharp'
import stream from 'stream'

const validator = createValidator({ passError: true })

export function validateBody(schema: Schema) {
    return validator.body(schema)
}

export function validateQuery(schema: Schema) {
    return validator.query(schema)
}

export function validateParams(schema: Schema) {
    return validator.params(schema)
}

export function validateHeaders(schema: Schema) {
    return validator.headers(schema)
}

export function requireFile() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            next(new ResponseError(401, 'Invalid request'))
        } else {
            next()
        }
    }
}

export function acceptMimeTypes(mimeTypes: RegExp | string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        let validator = Joi.string()
        if (mimeTypes instanceof RegExp) {
            validator = validator.regex(mimeTypes)
        } else {
            validator = validator.allow(...mimeTypes)
        }
        if (!req.file || validator.validate(req.file.mimetype).error) {
            next(new ResponseError(401, 'Unacceptable MIME type'))
        } else {
            next()
        }
    }
}

export function acceptMaximumSize(size: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.file || Joi.number().max(size).validate(req.file.size).error) {
            next(new ResponseError(413, 'File too large'))
        } else {
            next()
        }
    }
}

export function validateImage() {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            next(new ResponseError(401, 'Invalid image format'))
        } else {
            try {
                await sharp(req.file.buffer!).metadata()
                next()
            } catch (e) {
                next(new ResponseError(401, 'Invalid image format'))
            }
        }
    }
}