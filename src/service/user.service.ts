import { PrismaClient, User, UserRole } from '@prisma/client'
import * as uuid from 'uuid'
import * as OSSService from './oss.service'
import { ResponseError } from '../util/errors'
import sharp from 'sharp'
import fs from 'fs'
import initializeRoutine from '../app/initializeRoutine'
import { getPrismaClient } from '../util/prisma'
import logger from '../app/logger'

const prisma = getPrismaClient()

initializeRoutine.addAsyncRoutine(async () => {
    logger.info('Checking OSS avatar bucket')
    if (await OSSService.createBucketIfNotExist('avatar')) {
        logger.info('Avatar bucket does not exist, creating...')
        await uploadUserAvatar('default', fs.readFileSync('assets/default-avatar.svg'))
    }
    logger.info('OSS avatar bucket OK')
})

export function hasModifyPermissionOrElse403(currentUser: User, userId: string) {
    if (currentUser.role === UserRole.ADMIN) {
        return
    }
    if (!uuid.parse(userId).every(v => v === 0)) {
        throw new ResponseError(403, 'Permission denied')
    }
}

export function getTargetId(currentUser: User, userId: string) {
    return uuid.parse(userId).every(v => v === 0) ? currentUser.id : userId
}

export async function updateUserProfile(id: string, name?: string, description?: string): Promise<User> {
    return await prisma.user.update({
        where: { id },
        data: { name, description }
    })
}

export async function getUserAvatarLinks(id: string): Promise<{ avatar: string, thumbnail: string }> {
    if (await OSSService.existsObject('avatar', `${id}.webp`)) {
        const [avatar, thumbnail] = await Promise.all([OSSService.getObjectUrl('avatar', `${id}.webp`), OSSService.getObjectUrl('avatar', `${id}-thumbnail.webp`)])
        return { avatar, thumbnail }
    } else {
        const [avatar, thumbnail] = await Promise.all([OSSService.getObjectUrl('avatar', `default.webp`), OSSService.getObjectUrl('avatar', `default-thumbnail.webp`)])
        return { avatar, thumbnail }
    }
}

export async function uploadUserAvatar(id: string, buffer: Buffer): Promise<{ avatar: string, thumbnail: string }> {
    const [avatar, thumbnail] = await Promise.all([
        OSSService.putObject('avatar', `${id}.webp`, sharp(buffer).toFormat('webp')),
        OSSService.putObject('avatar', `${id}-thumbnail.webp`, sharp(buffer).resize(128, 128).toFormat('webp'))
    ])
    return { avatar, thumbnail }
}

export async function deleteUserAvatar(id: string) {
    await Promise.all([
        OSSService.removeObject('avatar', `${id}.webp`),
        OSSService.removeObject('avatar', `${id}-thumbnail.webp`)
    ])
}
