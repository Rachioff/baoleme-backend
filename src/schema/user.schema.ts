import Joi from 'joi'

export const userProfileParams = Joi.object({
    id: Joi.string().uuid().required()
}).required()

export const updateUserProfile = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional()
}).required()

export interface UpdateUserProfile {
    name?: string;
    description?: string;
}
