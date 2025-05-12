import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { PrismaClient, User } from '@prisma/client'
import * as AuthSchema from '../schema/auth.schema'
import { sendResetPasswordEmail, sendVerificationEmail } from '../service/mail.service'
import { generateAccessToken, generateResetPasswordToken, generateUpdateEmailToken, generateVerifyToken } from '../service/token.service'
import { ResponseError } from '../util/errors'
import { requireAuth, route, validate } from '../util/decorators'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const SALT_ROUNDS = 10

export default class AuthController {

    @route('post', '/auth/register')
    @validate('body', AuthSchema.registerLogin)
    static async register(req: Request, res: Response) {
        const { email, password } = req.body as AuthSchema.RegisterLogin
        
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            throw new ResponseError(403, 'Email already exists')
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
        const user = await prisma.user.create({
            data: { email, password: hashedPassword }
        })
    
        const token = generateVerifyToken(user.id)
        await sendVerificationEmail(email, token)
    
        res.status(204).send()
    }

    @route('post', '/auth/login')
    @validate('body', AuthSchema.registerLogin)
    static async login(req: Request, res: Response) {
        const { email, password } = req.body as AuthSchema.RegisterLogin
    
        const user = await prisma.user.findUnique({ where: { email, isVerified: true } })

        if (!user || !await bcrypt.compare(password, user.password)) {
            throw new ResponseError(403, 'Cannot login')
        }
    
        const token = generateAccessToken(user.id, user.password)
        res.status(200).json({ token, id: user.id })
    }

    @route('post', '/auth/update-email')
    @validate('body', AuthSchema.updateEmail)
    @requireAuth
    static async updateEmail(req: Request, res: Response) {
        const { newEmail } = req.body as AuthSchema.UpdateEmail

        const token = generateUpdateEmailToken((req.user as User).id, newEmail)
        await sendVerificationEmail(newEmail, token)

        res.status(204).send()
    }

    @route('post', '/auth/update-password')
    @validate('body', AuthSchema.updatePassword)
    @requireAuth
    static async updatePassword(req: Request, res: Response) {
        const { oldPassword, newPassword } = req.body as AuthSchema.UpdatePassword
        const user = req.user as User
        if (!await bcrypt.compare(oldPassword, user.password)) {
            throw new ResponseError(403, 'Old password is wrong')
        }
        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS)
        await prisma.user.update({
            where: { id: user.id },
            data: { password: user.password }
        })
        const token = generateAccessToken(user.id, user.password)
        res.status(200).json({ token })
    }

    @route('post', '/auth/forgot-password')
    @validate('body', AuthSchema.forgotPassword)
    static async forgotPassword(req: Request, res: Response) {
        const { email } = req.body as AuthSchema.ForgotPassword
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            throw new ResponseError(403, 'User does not exist')
        }
        const token = generateResetPasswordToken(user.id)
        await sendResetPasswordEmail(user.email, token)
        res.status(204).send()
    }

    @route('post', '/auth/verify-email')
    @validate('body', AuthSchema.verifyToken)
    static async verifyEmail(req: Request, res: Response) {
        const { token } = req.body as AuthSchema.VerifyToken
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
            
        if (!decoded.verify && !decoded.email) {
            throw new ResponseError(400, 'Invalid token')
        }
            
        const userId = decoded.sub as string
            
        const user = await prisma.user.findUnique({ where: { id: userId } })
            if (!user) {
                throw new ResponseError(400, 'User not found')
            }

        if (decoded.email) {
            await prisma.user.update({
                where: { id: userId },
                data: { email: decoded.email as string }
            })
        } else {
            await prisma.user.update({
                where: { id: userId },
                data: { isVerified: true }
            })
        }
        res.status(204).send()
    }

    @route('post', '/auth/reset-password')
    @validate('body', AuthSchema.resetPassword)
    static async resetPassword(req: Request, res: Response) {
        const { token, newPassword } = req.body as AuthSchema.ResetPassword
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
            
        if (!decoded.resetPassword) {
            throw new ResponseError(400, 'Invalid token')
        }
            
        const userId = decoded.sub as string
            
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            throw new ResponseError(400, 'User not found')
        }
            
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)
            
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })
            
        res.status(204).send()
    }
}
