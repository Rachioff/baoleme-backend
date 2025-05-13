import Joi from 'joi'

export const userProfileParams = Joi.object({
    id: Joi.string().uuid().required()
})

export const updateUserProfile = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional()
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
