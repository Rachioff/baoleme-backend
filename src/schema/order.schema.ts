import Joi from 'joi'

export const getOrdersQuery = Joi.object({
    p: Joi.number().integer().min(1).default(1).optional(),
    pn: Joi.number().integer().min(1).max(100).default(10).optional(),
}).required()

export interface GetOrdersQuery {
    p: string
    pn: string
}

export const createOrder = Joi.object({
    shopId: Joi.string().uuid().required(),
    addressId: Joi.string().uuid().required(),
    note: Joi.string().max(100).allow('').required(),
}).required()

export interface CreateOrder {
    shopId: string
    addressId: string
    note: string
}

export const orderIdParams = Joi.object({
    id: Joi.string().uuid().required(),
}).required()

export interface OrderIdParams {
    id: string
}