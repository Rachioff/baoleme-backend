import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import validator from 'validator'
import { PrismaClient } from '@prisma/client'
import { sendVerificationEmail } from '../service/mail.service'
import { generateAccessToken, generateVerifyToken } from '../service/token.service'
import { ResponseError } from '../util/errors'

const prisma = new PrismaClient()
const SALT_ROUNDS = 10

export async function register(req: Request, res: Response) {
    const { email, password } = req.body

    const verify = () => {
        if (typeof(email) !== 'string')
            return false
        if (typeof(password) !== 'string')
            return false
        if (!validator.isEmail(email))
            return false
        if (!validator.isLength(password, { min: 6 }))
            return false
        return true
    }
    if (!verify) {
        throw new ResponseError(400, 'Invalid request')
    }
    
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

    return res.status(204).send()

}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body

    const verify = () => {
        if (typeof(email) !== 'string')
            return false
        if (typeof(password) !== 'string')
            return false
        if (!validator.isEmail(email))
            return false
        if (!validator.isLength(password, { min: 6 }))
            return false
        return true
    }
    if (!verify) {
        throw new ResponseError(400, 'Invalid request')
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.findUnique({ where: { email, password: hashedPassword, isVerified: true } })
    if (!user) {
        throw new ResponseError(403, 'Cannot login')
    }

    const token = generateAccessToken(user.id, user.password)
    return res.status(200).json({ token, id: user.id })
}
