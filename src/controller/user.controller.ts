import { Request, Response } from 'express';
import { PrismaClient, User, userrole } from '@prisma/client';
import { validate as uuidValidate } from 'uuid';
import { ResponseError } from '../util/errors';
import { route, requireAuth, validate } from '../util/decorators';
import * as UserSchema from '../schema/user.schema';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const prisma = new PrismaClient();
const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true })
}

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
    
    @route('get', '/user/:id/avatar')
    @validate('params', UserSchema.getUserAvatar)
    @requireAuth
    static async getUserAvatar(req: Request, res: Response) {
        const { id } = req.params;
        const size = req.query.s ? parseInt(req.query.s as string) : undefined;

        if (size !== undefined && (isNaN(size) || size < 1 || size > 1024)) {
            throw new ResponseError(400, 'OUT OF RANGE')
        }   //size用@validate好像会报错，所以这里手动判断
        const currentUser = req.user as User;
        const targetId = id === '0' ? currentUser.id : id;

        const user = await prisma.user.findUnique({
            where: { id: targetId }
        });
        
        if (!user) {
            throw new ResponseError(404, 'User not found');
        }
        
        if (!user.avatarPath) {
            throw new ResponseError(404, 'No avatar set');
        }
        
        const avatarPath = path.join(AVATAR_DIR, user.avatarPath);
        
        if (!fs.existsSync(avatarPath)) {
            throw new ResponseError(404, 'Avatar file not found');
        }
        
        res.setHeader('Content-Type', 'image/png');
        
        if (size) {
            sharp(avatarPath)
                .resize(size, size, { fit: 'cover' })
                .png({ quality: 90 })
                .pipe(res)
        } else {
            sharp(avatarPath).png({ quality: 90 }).pipe(res);
        }
    }

    @route('patch', '/user/:id/avatar')
    @validate('params', UserSchema.updateUserAvatarParam)
    @requireAuth
    static async updateUserAvatar(req: Request, res: Response) {
        const { id } = req.params;
        const currentUser = req.user as User;
        let targetId = id === '0' ? currentUser.id : id;

        if(id !== '0' && currentUser.role !== userrole.ADMIN) {
            throw new ResponseError(403, 'Unauthorized')
        }

        const rawData = await new Promise<Buffer>((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
        });
        
        if (rawData.length === 0) {
            throw new ResponseError(400, 'No avatar data provided');
        }
        
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const fileName = `${timestamp}-${randomSuffix}.png`;
        const filePath = path.join(AVATAR_DIR, fileName);
        
        await sharp(rawData)
            .resize(200, 200, { fit: 'cover' })
            .png({ quality: 90 })
            .toFile(filePath);

        const user = await prisma.user.findUnique({
            where: { id: targetId }
        });
            
        if (!user) {
            fs.unlinkSync(filePath);
            throw new ResponseError(404, 'User not found');
        }
            
        if (user.avatarPath) {
            const oldPath = path.join(AVATAR_DIR, user.avatarPath);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
            
        await prisma.user.update({
            where: { id: targetId },
            data: { avatarPath: fileName }
        });
            
        const avatarUrl = `http://localhost:3000/api/user/${targetId}/avatar`;
        res.status(200).json({ url: avatarUrl });
    }

    @route('delete', '/user/:id/avatar')
    @validate('params', UserSchema.deleteUserAvatar)
    @requireAuth
    static async deleteUserAvatar(req: Request, res: Response) {
        const { id } = req.params;
        const currentUser = req.user as User;
        
        if (id !== '0' && currentUser.role !== userrole.ADMIN) {
            throw new ResponseError(403, 'Unauthorized');
        }
        
        const targetId = id === '0' ? currentUser.id : id;
        
        const user = await prisma.user.findUnique({
            where: { id: targetId }
        });
            
        if (!user) {
            throw new ResponseError(404, 'User not found');
        }
        
        if (!user.avatarPath) {
            throw new ResponseError(404, 'No avatar to delete');
        }
        
        const avatarPath = path.join(AVATAR_DIR, user.avatarPath);
        
        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }
        
        await prisma.user.update({
            where: { id: targetId },
            data: { avatarPath: null }
        });
        
        res.status(204).send();
    }
} 