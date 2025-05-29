import { Item, ItemCategory, Prisma, PrismaClient } from "@prisma/client";
import { classInjection, injected } from "../util/injection-decorators";
import { ResponseError } from "../util/errors";
import { CreateItem, UpdateItem } from '../schema/item.schema'
import { asyncInitializeRoutine } from "../app/container";
import { Logger } from "pino";
import OSSService from "./oss.service";
import sharp from "sharp";

@classInjection
export default class ItemService {

    @injected('logger', true)
    private logger!: Logger

    @injected
    private prisma!: PrismaClient

    @injected
    private ossService!: OSSService

    constructor() {
        asyncInitializeRoutine.addInitializer(async () => {
            try {
                this.logger.info('Checking OSS item bucket')
                if (await this.ossService.createBucketIfNotExist('item')) {
                    this.logger.info('Item bucket does not exist, creating...')
                }
                this.logger.info('OSS item bucket OK')
            } catch (err) {
                this.logger.error({ err }, 'OSS item bucket check failed')
                process.exit(1)
            }
        })
    }

    itemCategoryDataToItemCategoryInfo(category: ItemCategory) {
        return {
            id: category.id,
            name: category.name,
        }
    }

    async getItemCategories(shopId: string) {
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                itemCategories: {
                    orderBy: { order: 'asc' },
                },
            },
        })
        if (!shop) {
            throw new ResponseError(404, 'Shop not found')
        }
        return shop.itemCategories
    }

    async addItemCategory(currentUserId: string, shopId: string, name: string) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            const shop = await tx.shop.findUnique({
                where: { id: shopId },
            })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            if (!currentUser || (currentUser.id !== shop.ownerId && currentUser.role !== 'ADMIN')) {
                throw new ResponseError(403, 'Permission denied')
            }
            const maxOrder = (await tx.itemCategory.aggregate({
                where: { shopId },
                _max: { order: true },
            }))._max.order ?? -1
            return await tx.itemCategory.create({
                data: {
                    name,
                    shopId,
                    order: maxOrder + 1,
                },
            })
        })
    }

    async getItemCategory(shopId: string, categoryId: string) {
        return await this.prisma.$transaction(async tx => {
            const shop = await tx.shop.findUnique({
                where: { id: shopId },
            })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const category = await tx.itemCategory.findUnique({
                where: {
                    id: categoryId,
                    shopId: shop.id,
                },
            })
            if (!category) {
                throw new ResponseError(404, 'Item category not found')
            }
            return category
        })
    }

    async updateItemCategory(currentUserId: string, shopId: string, categoryId: string, name: string) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            const shop = await tx.shop.findUnique({
                where: { id: shopId },
            })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            if (!currentUser || (currentUser.id !== shop.ownerId && currentUser.role !== 'ADMIN')) {
                throw new ResponseError(403, 'Permission denied')
            }
            const category = await tx.itemCategory.findUnique({
                where: {
                    id: categoryId,
                    shopId: shop.id,
                },
            })
            if (!category) {
                throw new ResponseError(404, 'Item category not found')
            }
            return await tx.itemCategory.update({
                where: { id: categoryId },
                data: { name },
            })
        })
    }

    async updateItemCategoryPos(currentUserId: string, shopId: string, categoryId: string, before: string | null) {
        await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            const shop = await tx.shop.findUnique({ where: { id: shopId } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            if (!currentUser || (currentUser.id !== shop.ownerId && currentUser.role !== 'ADMIN')) {
                throw new ResponseError(403, 'Permission denied')
            }
            const category = await tx.itemCategory.findUnique({ 
                where: {
                    id: categoryId,
                    shopId: shop.id,
                } 
            })
            if (!category) {
                throw new ResponseError(404, 'Item category not found')
            }
            if (before) {
                const beforeCategory = await tx.itemCategory.findUnique({ where: { id: before } })
                if (!beforeCategory || beforeCategory.shopId !== shopId) {
                    throw new ResponseError(404, 'Item category not found')
                }
                if (category.order === beforeCategory.order) {
                    return
                }
                if (category.order < beforeCategory.order) {
                    await tx.itemCategory.updateMany({
                        where: {
                            shopId,
                            order: { gt: category.order, lt: beforeCategory.order }
                        },
                        data: { order: { decrement: 1 } }
                    })
                    await tx.itemCategory.update({
                        where: { id: categoryId },
                        data: { order: beforeCategory.order - 1 }
                    })
                } else {
                    await tx.itemCategory.updateMany({
                        where: {
                            shopId,
                            order: { lt: category.order, gte: beforeCategory.order }
                        },
                        data: { order: { increment: 1 } }
                    })
                    await tx.itemCategory.update({
                        where: { id: categoryId },
                        data: { order: beforeCategory.order }
                    })
                }
            } else {
                const maxOrder = (await tx.itemCategory.aggregate({
                    where: { shopId },
                    _max: { order: true }
                }))._max.order!
                await tx.itemCategory.updateMany({
                    where: {
                        shopId,
                        order: { gt: category.order }
                    },
                    data: { order: { decrement: 1 } }
                })
                await tx.itemCategory.update({
                    where: { id: categoryId },
                    data: { order: maxOrder }
                })
            }
        })
    }

    async deleteItemCategory(currentUserId: string, shopId: string, categoryId: string) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            const shop = await tx.shop.findUnique({
                where: { id: shopId },
            })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            if (!currentUser || (currentUser.id !== shop.ownerId && currentUser.role !== 'ADMIN')) {
                throw new ResponseError(403, 'Permission denied')
            }
            const category = await tx.itemCategory.findUnique({
                where: {
                    id: categoryId,
                    shopId: shop.id,
                },
            })
            if (!category) {
                throw new ResponseError(404, 'Item category not found')
            }
            await tx.itemCategory.delete({
                where: { id: categoryId },
            })
        })
    }

    async getItemImageLinks(itemId: string) {
        const [coverOrigin, coverThumbnail] = await Promise.all([
            this.ossService.getObjectUrl('item', `${itemId}-cover.webp`),
            this.ossService.getObjectUrl('item', `${itemId}-cover-thumbnail.webp`),
        ])
        return {
            cover: { origin: coverOrigin, thumbnail: coverThumbnail }
        }
    }

    async itemDataToFullItemInfo(item: Prisma.ItemGetPayload<{ include: { categories: true, shop: true } }>) {
        return {
            id: item.id,
            shopId: item.shopId,
            createdAt: item.createdAt,
            ...this.itemDataToItemProfile(item),
            ...await this.getItemImageLinks(item.id),
        }
    }

    itemDataToItemProfile(item: Prisma.ItemGetPayload<{ include: { categories: true, shop: true } }>) {
        return {
            name: item.name,
            description: item.description,
            available: item.available,
            stockout: item.stockout,
            price: item.price,
            priceWithoutPromotion: item.priceWithoutPromotion,
            categories: item.categories.map(category => category.id),
        }
    }

    async getItems(pageSkip: number, pageLimit: number){
        return await this.prisma.$transaction(async tx => {
            return await tx.item.findMany({
                include:{categories: true, shop: true},
                where: { available: true },
                skip: pageSkip,
                take: pageLimit,
                orderBy: { createdAt: 'desc' }
            })
        })        
    }

    async getItem(id: string) {
        const item = await this.prisma.item.findUnique({
            where: { id },
            include: { categories: true, shop: true }
        })
        if (!item) {
            throw new ResponseError(404, 'Item not found')
        }
        return item
    }

    async createItem(userId: string, request: CreateItem, cover?: Buffer){
        const { name, description, available, stockout, price, priceWithoutPromotion, categories, shopId } = request
        return await this.prisma.$transaction(async tx => {
            const user = await tx.user.findUnique({
                where: { id: userId }
            })
            if (!user) {
                throw new ResponseError(401, 'Unauthorized')
            }
            
            const shop = await tx.shop.findUnique({
                where: { id: shopId }
            })
            
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            
            if (shop.ownerId !== userId) {
                throw new ResponseError(403, 'Permission denied')
            }
            
            await Promise.all(request.categories.map(async id => {
                const category = await tx.itemCategory.findUnique({ 
                    where: { 
                        id,
                        shopId
                    } 
                })
                if (!category) {
                    throw new ResponseError(404, 'Item category not found')
                }
            }))
            
            const item = await tx.item.create({
                data: {
                    name,
                    description,
                    available,
                    stockout,
                    price,
                    priceWithoutPromotion,
                    shopId,
                    categories: { connect: categories.map(id => ({ id })) }
                },
                include: { categories: true, shop: true }
            })

            if (cover) {
                await this.processItemImage(item.id, cover)
            }
            
            return item
        })
    }

    readonly ossContentType = 'image/webp'

    private async processItemImage(itemId: string, cover: Buffer) {
        const tasks = []
        tasks.push(
            this.ossService.putObject('item', `${itemId}-cover.webp`, sharp(cover).toFormat('webp'), this.ossContentType),
            this.ossService.putObject('item', `${itemId}-cover-thumbnail.webp`, sharp(cover).resize(128, 128, { fit: 'outside' }).toFormat('webp'), this.ossContentType)
        )
        await Promise.all(tasks)
    }

    async updateItem(userId: string, id: string, request: UpdateItem, cover?: Buffer){
        const { name, description, available, stockout, price, priceWithoutPromotion, categories } = request
        return await this.prisma.$transaction(async tx => {
            const item = await tx.item.findUnique({ 
                where: { id },
                include: { shop: true }
            })
            if (!item) {
                throw new ResponseError(404, 'Item not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: userId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== item.shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
            
            if (categories) {
                await Promise.all(categories.map(async id => {
                    const category = await tx.itemCategory.findUnique({ 
                        where: { 
                            id,
                            shopId: item.shopId
                        } 
                    })
                    if (!category) {
                        throw new ResponseError(404, 'Item category not found')
                    }
                }))
            }
            
            const updatedItem = await tx.item.update({
                where: { id },
                data: {
                    name,
                    description,
                    available,
                    stockout,
                    price,
                    priceWithoutPromotion,
                    categories: categories ? { set: categories.map(id => ({ id })) } : undefined
                },
                include: { categories: true, shop: true }
            })

            if (cover) {
                await this.processItemImage(id, cover)
            }
            
            return updatedItem
        })
    }

    //这是真正的删除，但是我忘记会议内容了
    async deleteItem(currentUserId: string, id: string) {
        await this.prisma.$transaction(async tx => {
            const item = await tx.item.findUnique({ 
                where: { id },
                include: { shop: true }
            })
            if (!item) {
                throw new ResponseError(404, 'Item not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== item.shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
            
            await tx.item.delete({ where: { id } })
            await Promise.all([
                this.ossService.removeObject('item', `${id}-cover.webp`),
                this.ossService.removeObject('item', `${id}-cover-thumbnail.webp`),
            ])
        })
    }
}