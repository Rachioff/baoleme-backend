import { PrismaClient, User, userrole } from '@prisma/client'
import * as uuid from 'uuid'

const prisma = new PrismaClient()

export function hasModifyPermission(currentUser: User, userId: string) {
    if (currentUser.role === userrole.ADMIN) {
        return true
    }
    return uuid.parse(userId).every(v => v === 0)
}

export function getTargetId(currentUser: User, userId: string) {
    return uuid.parse(userId).every(v => v === 0) ? currentUser.id : userId
}

export  async function updateUserProfile(id: string, name?: string, description?: string): Promise<User> {
    return await prisma.user.update({
        where: { id },
        data: { name, description }
    })
}