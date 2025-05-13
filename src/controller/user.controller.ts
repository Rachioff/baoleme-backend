import { Router } from 'express'
import { User } from '@prisma/client'
import { ResponseError } from '../util/errors'
import * as UserSchema from '../schema/user.schema'
import * as AuthService from '../service/auth.service'
import * as UserService from '../service/user.service'
import { requireAuth } from '../middleware/auth.middleware'
import { validateBody, validateParams } from '../middleware/validator.middleware'

const router = Router()

router.get(
    '/user/:id/profile',
    requireAuth(),
    validateParams(UserSchema.userProfileParams),
    async (req, res) => {
        const { id } = req.params
        const user = await AuthService.getUserById(await UserService.getTargetId(req.user as User, id))
        if (!user) {
            throw new ResponseError(404, 'User not found')
        }

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

        if (!UserService.hasModifyPermission(req.user as User, id)) {
            throw new ResponseError(403, 'Permission denied')
        }

        let user = await AuthService.getUserById(await UserService.getTargetId(req.user as User, id))
        if (!user) {
            throw new ResponseError(404, 'User not found')
        }

        user = await UserService.updateUserProfile(user.id, name, description)

        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name || '',
            description: user.description || ''
        })
    }
)

export default router