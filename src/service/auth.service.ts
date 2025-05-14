import bcrypt from 'bcrypt'
import { User } from '@prisma/client'
import { ResponseError } from '../util/errors'
import { getPrismaClient } from '../util/prisma'

const prisma = getPrismaClient()
const SALT_ROUNDS = 10

export async function getUserById(id: string, encryptedPassword?: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    if (user && encryptedPassword && encryptedPassword !== user?.password) {
        return null
    }
    return user
}

export async function getUserByIdOrElse404(id: string): Promise<User> {
    const user = await getUserById(id)
    if (!user) {
        throw new ResponseError(404, 'User not found')
    }
    return user
}

export async function getUserByEmail(email: string, password?: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user && password && !await bcrypt.compare(password, user?.password)) {
        return null
    }
    return user
}

export async function createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.create({
        data: { email, password: hashedPassword }
    })
    return user
}

export async function updateUserVerified(id: string, isVerified: boolean): Promise<User> {
    return await prisma.user.update({
        where: { id },
        data: { isVerified }
    })
}

export async function updateUserEmail(id: string, email: string): Promise<User> {
    return await prisma.user.update({
        where: { id },
        data: { email }
    })
}

export async function updateUserPassword(id: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    return await prisma.user.update({
        where: { id },
        data: { password: hashedPassword }
    })
}