import Joi from 'joi'

export const getUserProfile = Joi.object({
    id: Joi.string().uuid().required()
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

export const getUserAvatar = Joi.object({
    id: Joi.string().uuid().required()
})

export interface GetUserAvatar {
    id: string
}

export const updateUserAvatarParam = Joi.object({
    id: Joi.string().uuid().required()
})

export interface UpdateUserAvatarParam {
    id: string
}

export const deleteUserAvatar = Joi.object({
    id: Joi.string().uuid().required()
})

export interface DeleteUserAvatar {
    id: string
}
