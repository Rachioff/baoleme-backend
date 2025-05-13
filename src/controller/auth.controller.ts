import { Router } from 'express'
import bcrypt from 'bcrypt'
import { User } from '@prisma/client'
import * as AuthSchema from '../schema/auth.schema'
import * as AuthService from '../service/auth.service'
import * as MailService from '../service/mail.service'
import * as TokenService from '../service/token.service'
import { ResponseError } from '../util/errors'
import { requireAuth } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validator.middleware'

const router = Router()

router.post(
    '/auth/register',
    validateBody(AuthSchema.registerLogin),
    async (req, res) => {
        const { email, password } = req.body as AuthSchema.RegisterLogin
        
        const existingUser = await AuthService.getUserByEmail(email)
        if (existingUser) {
            throw new ResponseError(403, 'Email already exists')
        }

        const user = await AuthService.createUser(email, password)
    
        const token = TokenService.generateVerifyToken(user.id)
        await MailService.sendVerificationEmail(email, token)
    
        res.status(204).send()
    }
)

router.post(
    '/auth/login',
    validateBody(AuthSchema.registerLogin),
    async (req, res) => {
        const { email, password } = req.body as AuthSchema.RegisterLogin
    
        const user = await AuthService.getUserByEmail(email, password)

        if (!user || !user.isVerified) {
            throw new ResponseError(403, 'Cannot login')
        }
    
        const token = TokenService.generateAccessToken(user.id, user.password)
        res.status(200).json({ token, id: user.id })
    }
)

router.post(
    '/auth/update-email',
    requireAuth(),
    validateBody(AuthSchema.updateEmail),
    async (req, res) => {
        const { newEmail } = req.body as AuthSchema.UpdateEmail

        const token = TokenService.generateUpdateEmailToken((req.user as User).id, newEmail)
        await MailService.sendVerificationEmail(newEmail, token)

        res.status(204).send()
    }
)

router.post(
    '/auth/update-password',
    requireAuth(),
    validateBody(AuthSchema.updatePassword),
    async (req, res) => {
        const { oldPassword, newPassword } = req.body as AuthSchema.UpdatePassword
        const user = req.user as User
        if (!await bcrypt.compare(oldPassword, user.password)) {
            throw new ResponseError(403, 'Old password is wrong')
        }
        await AuthService.updateUserPassword(user.id, newPassword)
        const token = TokenService.generateAccessToken(user.id, newPassword)
        res.status(200).json({ token })
    }
)

router.post(
    '/auth/forgot-password',
    validateBody(AuthSchema.forgotPassword),
    async (req, res) => {
        const { email } = req.body as AuthSchema.ForgotPassword
        const user = await AuthService.getUserByEmail(email)
        if (!user || !user.isVerified) {
            throw new ResponseError(403, 'User does not exist')
        }
        const token = TokenService.generateResetPasswordToken(user.id)
        await MailService.sendResetPasswordEmail(user.email, token)
        res.status(204).send()
    }
)

router.post(
    '/auth/verify-register',
    validateBody(AuthSchema.verifyToken),
    async (req, res) => {
        const { token } = req.body as AuthSchema.VerifyToken
        const decoded = await TokenService.decodeVerifyToken(token)

        if (!decoded) {
            throw new ResponseError(403, 'Invalid token')
        }

        const userId = decoded.sub as string
        await AuthService.updateUserVerified(userId, true)

        res.status(204).send()
    }
)

router.post(
    '/auth/verify-email',
    validateBody(AuthSchema.verifyToken),
    async (req, res) => {
        const { token } = req.body as AuthSchema.VerifyToken
        const decoded = await TokenService.decodeUpdateEmailToken(token)

        if (!decoded) {
            throw new ResponseError(403, 'Invalid token')
        }

        const userId = decoded.sub as string
        await AuthService.updateUserEmail(userId, decoded.email)

        res.status(204).send()
    }
)

router.post(
    '/auth/reset-password',
    validateBody(AuthSchema.resetPassword),
    async (req, res) => {
        const { token, newPassword } = req.body as AuthSchema.ResetPassword
        const decoded = await TokenService.decodeResetPasswordToken(token)

        if (!decoded) {
            throw new ResponseError(403, 'Invalid token')
        }

        const userId = decoded.sub as string
        await AuthService.updateUserPassword(userId, newPassword)

        res.status(204).send()
    }
)

export default router
