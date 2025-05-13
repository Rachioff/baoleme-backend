import { createValidator } from 'express-joi-validation'
import { Schema } from 'joi'

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