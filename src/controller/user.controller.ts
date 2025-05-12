import { Request, Response } from 'express';
import { PrismaClient, User, userrole } from '@prisma/client';
import { validate as uuidValidate } from 'uuid';
import { ResponseError } from '../util/errors';
import { route, requireAuth, validate } from '../util/decorators';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sharp from 'sharp';
import * as UserSchema from '../schema/user.schema';

const prisma = new PrismaClient();

export default class UserController {

  @route('get', '/user/:id/profile')
  @requireAuth
  static async getUserProfile(req: Request, res: Response) {
    const { id } = req.params;
    
    if (id !== '0' && !uuidValidate(id)) {
      throw new ResponseError(400, '用户ID格式不正确');
    }
    
    const targetId = id === '0' ? (req.user as User).id : id;
    
    const user = await prisma.user.findUnique({
        where: { id: targetId }
    });
      
    if (!user) {
        throw new ResponseError(404, '用户不存在');
    }
    res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name || '',
        description: user.description || ''
    });
  }

  @route('patch', '/user/:id/profile')
  @requireAuth
  @validate('body', UserSchema.updateUserProfile)
  static async updateUserProfile(req: Request, res: Response) {
    const { id } = req.params;
    const { name, description } = req.body as UserSchema.UpdateUserProfile;
    
    if (id !== '0' && !uuidValidate(id)) {
      throw new ResponseError(400, '用户ID格式不正确');
    }

    const currentUser = req.user as User;
    let targetId = id === '0' ? currentUser.id : id;
    
    if (currentUser.role !== userrole.ADMIN && targetId !== currentUser.id) {
      throw new ResponseError(403, '无权限修改该用户资料');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId }
    });
    
    if (!user) {
      throw new ResponseError(400, '用户不存在');
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