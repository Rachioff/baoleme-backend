import { Request, Response } from 'express';
import { PrismaClient, User, userrole } from '@prisma/client';
import { ResponseError } from '../util/errors';
import { route, requireAuth, validate } from '../util/decorators';
import * as UserSchema from '../schema/user.schema';

const prisma = new PrismaClient();

export default class UserController {

    @route('get', '/user/:id/profile')
    @validate('params', UserSchema.getUserProfile)
    @requireAuth
    static async getUserProfile(req: Request, res: Response) {
        const { id } = req.params;

        const targetId = id === '0' ? (req.user as User).id : id;

        const user = await prisma.user.findUnique({
            where: { id: targetId }
        });
            
        if (!user) {
            throw new ResponseError(404, 'User not found');
        }

        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name || '',
            description: user.description || ''
        });
    }

    @route('patch', '/user/:id/profile')
    @validate('params', UserSchema.updateUserProfile)
    @requireAuth
    static async updateUserProfile(req: Request, res: Response) {
        const { id } = req.params;
        const { name, description } = req.body as UserSchema.UpdateUserProfile;

        const currentUser = req.user as User;
        let targetId = id === '0' ? currentUser.id : id;

        if (currentUser.role !== userrole.ADMIN && targetId !== currentUser.id) {
            throw new ResponseError(403, 'Unauthorized');
        }

        const user = await prisma.user.findUnique({
            where: { id: targetId }
        });
        
        if (!user) {
            throw new ResponseError(404, 'User not found');
        }

        await prisma.user.update({
            where: { id: targetId },
            data: {
                name: name !== undefined ? name : undefined,
                description: description !== undefined ? description : undefined
            }
        });
        res.status(200).send();
    }
} 