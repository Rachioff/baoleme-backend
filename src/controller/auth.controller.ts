import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { sendVerificationEmail } from '../service/mail.service'
import { generateResetToken } from '../service/token.service'
import { ResponseError } from '../util/errors'

const prisma = new PrismaClient()
const SALT_ROUNDS = 10

export const register = async (req: Request, res: Response) => {
    const { email, password } = req.body
    
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        throw new ResponseError(403, 'Email already exists')
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.create({
        data: { email, password: hashedPassword }
    })

    const token = generateResetToken(user.id)
    await sendVerificationEmail(email, token)

    return res.status(204).send()
    
}
