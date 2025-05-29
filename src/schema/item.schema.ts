import Joi from 'joi'

export const itemIdParams = Joi.object({
    id: Joi.string().uuid().required()
})

export interface ItemIdParams {
    id: string
}

export const shopIdParams = Joi.object({
    id: Joi.string().uuid().required()
})

export interface ShopIdParams {
    id: string
}

export const itemsQueryParams = Joi.object({
    p: Joi.number().integer().min(0).default(0).optional(),
    pn: Joi.number().integer().min(1).max(100).default(10).optional(),
})

export interface ItemsQueryParams {
    p: string
    pn: string
}

export const createItem = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    available: Joi.boolean().required(),
    stockout: Joi.boolean().required(),
    price: Joi.number().min(0).required(),
    priceWithoutPromotion: Joi.number().min(0).required(),
    categories: Joi.array().items(Joi.string()).required(),
    shopId: Joi.string().uuid().required()
})

export interface CreateItem {
    name: string
    description: string
    available: boolean
    stockout: boolean
    price: number
    priceWithoutPromotion: number
    categories: string[]
    shopId: string  
}

export const updateItem = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('').optional(),
    available: Joi.boolean().optional(),
    stockout: Joi.boolean().optional(),
    price: Joi.number().min(0).optional(),
    priceWithoutPromotion: Joi.number().min(0).optional(),
    categories: Joi.array().items(Joi.string()).optional()
})

export interface UpdateItem {
    name?: string
    description?: string
    available?: boolean
    stockout?: boolean
    price?: number
    priceWithoutPromotion?: number
    categories?: string[]
}