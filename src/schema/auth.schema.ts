import Joi from 'joi'

export const registerLogin = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
})

export interface RegisterLogin {
    email: string
    password: string
}

export const updateEmail = Joi.object({
    newEmail: Joi.string().email().required()
})

export interface UpdateEmail {
    newEmail: string
}

export const updatePassword = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
})

export interface UpdatePassword {
    oldPassword: string
    newPassword: string
}

export const forgotPassword = Joi.object({
    email: Joi.string().required()
})

export interface ForgotPassword {
    email: string
}
