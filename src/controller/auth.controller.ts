import { Router } from 'express'
import bcrypt from 'bcrypt'
import * as AuthSchema from '../schema/auth.schema'
import AuthService from '../service/auth.service'
import MailService from '../service/mail.service'
import TokenService from '../service/token.service'
import { ResponseError } from '../util/errors'
import { validateBody } from '../middleware/validator.middleware'
import { factoryInjection, factoryMethod, injected } from '../util/injection-decorators'

class AuthController {

    @factoryMethod
    static authController(
        @injected('authService') authService: AuthService,
        @injected('tokenService') tokenService: TokenService,
        @injected('mailService') mailService: MailService,
    ) {
        const router = Router()

        router.post(
            '/auth/register',
            validateBody(AuthSchema.registerLogin),
            async (req, res) => {
                const { email, password } = req.body as AuthSchema.RegisterLogin
                
                const existingUser = await authService.getUserByEmail(email)
                if (existingUser) {
                    throw new ResponseError(403, 'Email already exists')
                }

                const user = await authService.createUser(email, password)
            
                const token = tokenService.generateVerifyToken(user.id)
                await mailService.sendVerifyRegisterEmail(email, token)
            
                res.status(204).send()
            }
        )

        router.post(
            '/auth/login',
            validateBody(AuthSchema.registerLogin),
            async (req, res) => {
                const { email, password } = req.body as AuthSchema.RegisterLogin
            
                const user = await authService.getUserByEmail(email, password)

                if (!user || !user.isVerified) {
                    throw new ResponseError(403, 'Cannot login')
                }
            
                const token = tokenService.generateAccessToken(user.id, user.password)
                res.status(200).json({ token, id: user.id })
            }
        )

        router.post(
            '/auth/update-email',
            authService.requireAuth(),
            validateBody(AuthSchema.updateEmail),
            async (req, res) => {
                const { newEmail } = req.body as AuthSchema.UpdateEmail

                const token = tokenService.generateUpdateEmailToken(req.user!.id, newEmail)
                await mailService.sendVerifyEmailEmail(newEmail, token)

                res.status(204).send()
            }
        )

        router.post(
            '/auth/update-password',
            authService.requireAuth(),
            validateBody(AuthSchema.updatePassword),
            async (req, res) => {
                const { oldPassword, newPassword } = req.body as AuthSchema.UpdatePassword
                const user = req.user!
                if (!await bcrypt.compare(oldPassword, user.password)) {
                    throw new ResponseError(403, 'Old password is wrong')
                }
                await authService.updateUserPassword(user.id, newPassword)
                const token = tokenService.generateAccessToken(user.id, newPassword)
                res.status(200).json({ token })
            }
        )

        router.post(
            '/auth/forgot-password',
            validateBody(AuthSchema.forgotPassword),
            async (req, res) => {
                const { email } = req.body as AuthSchema.ForgotPassword
                const user = await authService.getUserByEmail(email)
                if (!user || !user.isVerified) {
                    throw new ResponseError(403, 'User does not exist')
                }
                const token = tokenService.generateResetPasswordToken(user.id)
                await mailService.sendResetPasswordEmail(user.email, token)
                res.status(204).send()
            }
        )

        router.post(
            '/auth/verify-register',
            validateBody(AuthSchema.verifyToken),
            async (req, res) => {
                const { token } = req.body as AuthSchema.VerifyToken
                const decoded = await tokenService.decodeVerifyToken(token)

                if (!decoded) {
                    throw new ResponseError(403, 'Invalid token')
                }

                const userId = decoded.sub as string
                await authService.updateUserVerified(userId, true)

                res.status(204).send()
            }
        )

        router.post(
            '/auth/verify-email',
            validateBody(AuthSchema.verifyToken),
            async (req, res) => {
                const { token } = req.body as AuthSchema.VerifyToken
                const decoded = await tokenService.decodeUpdateEmailToken(token)

                if (!decoded) {
                    throw new ResponseError(403, 'Invalid token')
                }

                const userId = decoded.sub as string
                await authService.updateUserEmail(userId, decoded.email)

                res.status(204).send()
            }
        )

        router.post(
            '/auth/reset-password',
            validateBody(AuthSchema.resetPassword),
            async (req, res) => {
                const { token, newPassword } = req.body as AuthSchema.ResetPassword
                const decoded = await tokenService.decodeResetPasswordToken(token)

                if (!decoded) {
                    throw new ResponseError(403, 'Invalid token')
                }

                const userId = decoded.sub as string
                await authService.updateUserPassword(userId, newPassword)

                res.status(204).send()
            }
        )

        return router

    }
}

export default factoryInjection(AuthController)
