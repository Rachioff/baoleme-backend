import { Router } from 'express'
import * as UserSchema from '../schema/user.schema'
import AuthService from '../service/auth.service'
import UserService from '../service/user.service'
import { acceptMaximumSize, acceptMimeTypes, requireFile, validateBody, validateImage, validateParams } from '../middleware/validator.middleware'
import upload from '../middleware/upload.middleware'
import { factoryInjection, factoryMethod, injected } from '../util/injection-decorators'

class UserController {
    @factoryMethod
    static userController(
        @injected('authService') authService: AuthService,
        @injected('userService') userService: UserService,
    ) {
        const router = Router()

        router.get(
            '/user/:id/profile',
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            async (req, res) => {
                const { id } = req.params
                const user = await authService.getUserByIdOrElse404(userService.getTargetId(req.user!, id))

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
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            validateBody(UserSchema.updateUserProfile),
            async (req, res) => {
                const { id } = req.params
                const { name, description } = req.body as UserSchema.UpdateUserProfile

                userService.hasModifyPermissionOrElse403(req.user!, id)
                let user = await authService.getUserByIdOrElse404(userService.getTargetId(req.user!, id))
                user = await userService.updateUserProfile(user.id, name, description)

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
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            async (req, res) => {
                const { id } = req.params
                const user = await authService.getUserByIdOrElse404(userService.getTargetId(req.user!, id))
                
                res.status(200).json(await userService.getUserAvatarLinks(user.id))
            }
        )

        router.patch(
            '/user/:id/avatar',
            upload.single('avatar'),
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            requireFile(),
            acceptMimeTypes(/^image\//),
            acceptMaximumSize(4 * 1024 * 1024),
            validateImage(),
            async (req, res) => {
                const { id } = req.params
                userService.hasModifyPermissionOrElse403(req.user!, id)
                const user = await authService.getUserByIdOrElse404(userService.getTargetId(req.user!, id))
                const { avatar, thumbnail } = await userService.uploadUserAvatar(user.id, req.file!.buffer)

                res.status(200).json({ avatar, thumbnail })
            }
        )

        router.delete(
            '/user/:id/avatar',
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            async (req, res) => {
                const { id } = req.params
                userService.hasModifyPermissionOrElse403(req.user!, id)
                const user = await authService.getUserByIdOrElse404(userService.getTargetId(req.user!, id))

                await userService.deleteUserAvatar(user.id)

                res.status(204).send()
            }
        )

        return router
    }
}

export default factoryInjection(UserController)
