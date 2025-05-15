import { PrismaClient, User, UserRole } from '@prisma/client'
import * as uuid from 'uuid'
import { ResponseError } from '../util/errors'
import sharp from 'sharp'
import fs from 'fs'
import OSSService from './oss.service'
import { asyncInitializeRoutine } from '../app/container'
import { Logger } from 'pino'
import { classInjection, injected } from '../util/injection-decorators'

@classInjection
export default class UserService {

    @injected('logger', true)
    private logger!: Logger

    @injected
    private prisma!: PrismaClient

    @injected
    private ossService!: OSSService

    constructor() {
        asyncInitializeRoutine.addInitializer(async () => {
            try {
                this.logger.info('Checking OSS avatar bucket')
                if (await this.ossService.createBucketIfNotExist('avatar')) {
                    this.logger.info('Avatar bucket does not exist, creating...')
                    await this.uploadUserAvatar('default', fs.readFileSync('assets/default-avatar.svg'))
                }
                this.logger.info('OSS avatar bucket OK')
            } catch (err) {
                this.logger.error({ err }, 'OSS avatar bucket check failed')
                process.exit(1)
            }
        })
    }

    hasModifyPermissionOrElse403(currentUser: User, userId: string) {
        if (currentUser.role === UserRole.ADMIN) {
            return
        }
        if (!uuid.parse(userId).every(v => v === 0)) {
            throw new ResponseError(403, 'Permission denied')
        }
    }

    getTargetId(currentUser: User, userId: string) {
        return uuid.parse(userId).every(v => v === 0) ? currentUser.id : userId
    }

    async updateUserProfile(id: string, name?: string, description?: string): Promise<User> {
        return await this.prisma.user.update({
            where: { id },
            data: { name, description }
        })
    }

    async getUserAvatarLinks(id: string): Promise<{ avatar: string, thumbnail: string }> {
        if (await this.ossService.existsObject('avatar', `${id}.webp`)) {
            const [avatar, thumbnail] = await Promise.all([this.ossService.getObjectUrl('avatar', `${id}.webp`), this.ossService.getObjectUrl('avatar', `${id}-thumbnail.webp`)])
            return { avatar, thumbnail }
        } else {
            const [avatar, thumbnail] = await Promise.all([this.ossService.getObjectUrl('avatar', `default.webp`), this.ossService.getObjectUrl('avatar', `default-thumbnail.webp`)])
            return { avatar, thumbnail }
        }
    }

    async uploadUserAvatar(id: string, buffer: Buffer): Promise<{ avatar: string, thumbnail: string }> {
        const [avatar, thumbnail] = await Promise.all([
            this.ossService.putObject('avatar', `${id}.webp`, sharp(buffer).toFormat('webp')),
            this.ossService.putObject('avatar', `${id}-thumbnail.webp`, sharp(buffer).resize(128, 128).toFormat('webp'))
        ])
        return { avatar, thumbnail }
    }

    async deleteUserAvatar(id: string) {
        await Promise.all([
            this.ossService.removeObject('avatar', `${id}.webp`),
            this.ossService.removeObject('avatar', `${id}-thumbnail.webp`)
        ])
    }
   
}
