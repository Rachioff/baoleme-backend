import Joi from 'joi'

export const getUserProfile = Joi.object({
    id: Joi.string().required()
})

export interface GetUserProfile {
    id: string
}

export const updateUserProfile = Joi.object({
    name: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional()
})

export interface UpdateUserProfile {
    name?: string;
    description?: string;
}
