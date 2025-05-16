import Joi from 'joi'

export const userProfileParams = Joi.object({
    id: Joi.string().uuid().required()
}).required()

export const updateUserProfile = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    role: Joi.string().valid('customer', 'rider', 'merchant', 'admin').optional()
}).required()

export interface UpdateUserProfile {
    name?: string;
    description?: string;
    role?: 'customer' | 'rider' | 'merchant' | 'admin'
}
