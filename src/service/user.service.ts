import { PrismaClient, User, UserRole } from '@prisma/client'
import * as uuid from 'uuid'
import { ResponseError } from '../util/errors'
import sharp from 'sharp'
import fs from 'fs'
import OSSService from './oss.service'
import { asyncInitializeRoutine } from '../app/container'
import { Logger } from 'pino'
import { classInjection, injected } from '../util/injection-decorators'
import { UpdateUserProfile } from '../schema/user.schema'

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
        if (!uuid.validate(userId) || !uuid.parse(userId).every(v => v === 0)) {
            throw new ResponseError(403, 'Permission denied')
        }
    }

    getTargetId(currentUser: User, userId: string) {
        return uuid.validate(userId) && uuid.parse(userId).every(v => v === 0) ? currentUser.id : userId
    }

    hasRoleModifyPermissionOrElse403(currentUser: User, role?: UpdateUserProfile['role']) {
        if (currentUser.role === UserRole.ADMIN) {
            return
        }
        if (role === 'admin') {
            throw new ResponseError(403, 'Permission denied')
        }
    }

    async updateUserProfile(id: string, name?: string, description?: string, role?: UpdateUserProfile['role'], emailVisible?: boolean, createdAtVisible?: boolean): Promise<User> {
        let roleKey: UserRole | undefined
        if (role === undefined) {
            roleKey = undefined
        } else if (role === 'customer') {
            roleKey = UserRole.USER
        } else if (role === 'rider') {
            roleKey = UserRole.RIDER
        } else if (role === 'merchant') {
            roleKey = UserRole.MERCHANT
        } else if (role === 'admin') {
            roleKey = UserRole.ADMIN
        } else {
            throw new Error('Unreachable')
        }
        return await this.prisma.user.update({
            where: { id },
            data: { name, description, role: roleKey, emailVisible, createdAtVisible },
        })
    }

    readonly ossContentType = 'image/webp'

    async getUserAvatarLinks(id: string): Promise<{ origin: string, thumbnail: string }> {
        if (await this.ossService.existsObject('avatar', `${id}.webp`)) {
            const [origin, thumbnail] = await Promise.all([this.ossService.getObjectUrl('avatar', `${id}.webp`), this.ossService.getObjectUrl('avatar', `${id}-thumbnail.webp`)])
            return { origin, thumbnail }
        } else {
            const [origin, thumbnail] = await Promise.all([this.ossService.getObjectUrl('avatar', `default.webp`), this.ossService.getObjectUrl('avatar', `default-thumbnail.webp`)])
            return { origin, thumbnail }
        }
    }

    async uploadUserAvatar(id: string, buffer: Buffer): Promise<{ origin: string, thumbnail: string }> {
        const [origin, thumbnail] = await Promise.all([
            this.ossService.putObject('avatar', `${id}.webp`, sharp(buffer).toFormat('webp'), this.ossContentType),
            this.ossService.putObject('avatar', `${id}-thumbnail.webp`, sharp(buffer).resize(128, 128).toFormat('webp'), this.ossContentType)
        ])
        return { origin, thumbnail }
    }

    async deleteUserAvatar(id: string) {
        await Promise.all([
            this.ossService.removeObject('avatar', `${id}.webp`),
            this.ossService.removeObject('avatar', `${id}-thumbnail.webp`)
        ])
    }

    getUserRole(user: User): UpdateUserProfile['role'] & string {
        if (user.role === UserRole.USER) {
            return 'customer'
        } else if (user.role === UserRole.RIDER) {
            return 'rider'
        } else if (user.role === UserRole.MERCHANT) {
            return 'merchant'
        } else if (user.role === UserRole.ADMIN) {
            return 'admin'
        }
        throw new Error('Unreachable')
    }

    isEmailVisibleTo(currentUser: User, user: User) {
        return currentUser.role === UserRole.ADMIN || currentUser.id === user.id || user.emailVisible
    }

    isCreatedAtVisibleTo(currentUser: User, user: User) {
        return currentUser.role === UserRole.ADMIN || currentUser.id === user.id || user.createdAtVisible
    }
   
}
