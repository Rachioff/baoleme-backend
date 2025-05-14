import { Router } from 'express'
import * as UserSchema from '../schema/user.schema'
import * as AuthService from '../service/auth.service'
import * as UserService from '../service/user.service'
import { requireAuth } from '../middleware/auth.middleware'
import { acceptMaximumSize, acceptMimeTypes, requireFile, validateBody, validateImage, validateParams } from '../middleware/validator.middleware'
import upload from '../middleware/upload.middleware'

const router = Router()

router.get(
    '/user/:id/profile',
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    async (req, res) => {
        const { id } = req.params
        const user = await AuthService.getUserByIdOrElse404(UserService.getTargetId(req.user!, id))

        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name || '',
            description: user.description || ''
        })
    }
)

router.patch(
    '/user/:id/profile',
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    validateBody(UserSchema.updateUserProfile),
    async (req, res) => {
        const { id } = req.params
        const { name, description } = req.body as UserSchema.UpdateUserProfile

        UserService.hasModifyPermissionOrElse403(req.user!, id)
        let user = await AuthService.getUserByIdOrElse404(UserService.getTargetId(req.user!, id))
        user = await UserService.updateUserProfile(user.id, name, description)

        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name || '',
            description: user.description || ''
        })
    }
)

router.get(
    '/user/:id/avatar',
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    async (req, res) => {
        const { id } = req.params
        const user = await AuthService.getUserByIdOrElse404(UserService.getTargetId(req.user!, id))
        
        res.status(200).json(await UserService.getUserAvatarLinks(user.id))
    }
)

router.patch(
    '/user/:id/avatar',
    upload.single('avatar'),
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    requireFile(),
    acceptMimeTypes(/^image\//),
    acceptMaximumSize(4 * 1024 * 1024),
    validateImage(),
    async (req, res) => {
        const { id } = req.params
        UserService.hasModifyPermissionOrElse403(req.user!, id)
        const user = await AuthService.getUserByIdOrElse404(UserService.getTargetId(req.user!, id))
        const { avatar, thumbnail } = await UserService.uploadUserAvatar(user.id, req.file!.buffer)

        res.status(200).json({ avatar, thumbnail })
    }
)

router.delete(
    '/user/:id/avatar',
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    async (req, res) => {
        const { id } = req.params
        UserService.hasModifyPermissionOrElse403(req.user!, id)
        const user = await AuthService.getUserByIdOrElse404(UserService.getTargetId(req.user!, id))

        await UserService.deleteUserAvatar(user.id)

        res.status(204).send()
    }
)

export default router