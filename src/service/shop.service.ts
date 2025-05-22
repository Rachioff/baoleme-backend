import { Prisma, PrismaClient, Shop, User } from "@prisma/client";
import { classInjection, injected } from "../util/injection-decorators";
import { asyncInitializeRoutine } from "../app/container";
import { Logger } from "pino";
import OSSService from "./oss.service";
import { CreateShop, UpdateShopProfile } from "../schema/shop.schema";
import { ResponseError } from "../util/errors";
import sharp from "sharp";

@classInjection
export default class ShopService {

    @injected('logger', true)
    private logger!: Logger

    @injected
    private prisma!: PrismaClient

    @injected
    private ossService!: OSSService

    constructor() {
        asyncInitializeRoutine.addInitializer(async () => {
            try {
                this.logger.info('Checking OSS shop bucket')
                if (await this.ossService.createBucketIfNotExist('shop')) {
                    this.logger.info('Shop bucket does not exist, creating...')
                }
                this.logger.info('OSS shop bucket OK')
            } catch (err) {
                this.logger.error({ err }, 'OSS shop bucket check failed')
                process.exit(1)
            }
        })
    }

    async getFilteredGlobalShops(pageSkip: number, pageLimit: number, filterKeywords: string[], minCreatedAt?: Date, maxCreatedAt?: Date) {
        return await this.prisma.shop.findMany({
            include: { categories: true, address: true },
            where: {
                AND: [
                    {
                        OR: filterKeywords.map(keyword => ({
                            name: {
                                contains: keyword,
                                mode: 'insensitive' as Prisma.QueryMode
                            }
                        }))
                    },
                    { createdAt: { gte: minCreatedAt } },
                    { createdAt: { lte: maxCreatedAt } }
                ]
            },
            skip: pageSkip,
            take: pageLimit,
            orderBy: { createdAt: 'desc' },
        })
    }

    async getShopsByOwnerId(ownerId: string) {
        return await this.prisma.$transaction(async tx => {
            if (!await tx.user.findUnique({ where: { id: ownerId } })) {
                throw new ResponseError(404, 'User not found')
            }
            return await tx.shop.findMany({
                include: { categories: true, address: true },
                where: { ownerId },
                orderBy: { createdAt: 'desc' },
            })
        })
    }

    async getShopImageLinks(shopId: string) {
        const [coverOrigin, coverThumbnail, detailOrigin, detailThumbnail, licenseOrigin, licenseThumbnail] = await Promise.all([
            this.ossService.getObjectUrl('shop', `${shopId}-cover.webp`),
            this.ossService.getObjectUrl('shop', `${shopId}-cover-thumbnail.webp`),
            this.ossService.getObjectUrl('shop', `${shopId}-detail.webp`),
            this.ossService.getObjectUrl('shop', `${shopId}-detail-thumbnail.webp`),
            this.ossService.getObjectUrl('shop', `${shopId}-license.webp`),
            this.ossService.getObjectUrl('shop', `${shopId}-license-thumbnail.webp`),
        ])
        return {
            cover: { origin: coverOrigin, thumbnail: coverThumbnail },
            detailImage: { origin: detailOrigin, thumbnail: detailThumbnail },
            license: { origin: licenseOrigin, thumbnail: licenseThumbnail }
        }
    }

    async shopDataToFullShopInfo(shop: Prisma.ShopGetPayload<{ include: { categories: true, address: true } }>) {
        return {
            id: shop.id,
            owner: shop.ownerId,
            createdAt: shop.createdAt,
            ...this.shopDataToShopProfile(shop),
            ...await this.getShopImageLinks(shop.id),
            rating: shop.rating,
            sale: shop.sale,
            averagePrice: shop.averagePrice,
        }
    }

    shopDataToShopProfile(shop: Prisma.ShopGetPayload<{ include: { categories: true, address: true } }>) {
        return {
            name: shop.name,
            description: shop.description,
            categories: shop.categories.map(category => category.id),
            address: {
                coordinate: [shop.address?.latitude, shop.address?.longitude],
                province: shop.address?.province,
                city: shop.address?.city,
                district: shop.address?.district,
                town: shop.address?.town,
                address: shop.address?.address,
                name: shop.address?.name,
                tel: shop.address?.tel,
            },
            verified: shop.verified,
            opened: shop.opened,
            openTimeStart: shop.openTimeStart,
            openTimeEnd: shop.openTimeEnd,
            deliveryThreshold: shop.deliveryThreshold,
            deliveryPrice: shop.deliveryPrice,
            maximumDistance: shop.maximumDistance,
        }
    }

    async createShop(userId: string, request: CreateShop) {
        const { name, description, categories, address, opened, openTimeStart, openTimeEnd, deliveryThreshold, deliveryPrice, maximumDistance } = request
        return await this.prisma.$transaction(async tx => {
            const user = await tx.user.findUnique({ where: { id: userId } })
            if (!user) {
                throw new ResponseError(401, 'Unauthorized')
            }
            await Promise.all(request.categories.map(async id => {
                const category = await tx.shopCategory.findUnique({ where: { id } })
                if (!category) {
                    throw new ResponseError(404, 'Shop category not found')
                }
            }))
            return await tx.shop.create({
                data: {
                    name,
                    description,
                    ownerId: userId,
                    opened,
                    openTimeStart,
                    openTimeEnd,
                    deliveryThreshold,
                    deliveryPrice,
                    maximumDistance,
                    categories: { connect: categories.map(id => ({ id })) },
                    address: {
                        create: {
                            latitude: address.coordinate[0],
                            longitude: address.coordinate[1],
                            province: address.province,
                            city: address.city,
                            district: address.district,
                            town: address.town,
                            address: address.address,
                            name: address.name,
                            tel: address.tel
                        }
                    }
                },
                include: { categories: true, address: true }
            })
        })
    }

    async getShop(id: string) {
        const shop = await this.prisma.shop.findUnique({
            where: { id },
            include: { categories: true, address: true }
        })
        if (!shop) {
            throw new ResponseError(404, 'Shop not found')
        }
        return shop
    }

    async deleteShop(currentUserId: string, id: string) {
        await this.prisma.$transaction(async tx => {
            const shop = await tx.shop.findUnique({ where: { id } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
            if (/* TODO check if the shop has any unfinished orders) */ false) {
                throw new ResponseError(409, 'Shop status conflicts')
            }
            await tx.shop.delete({ where: { id } })
            await Promise.all([
                this.ossService.removeObject('shop', `${id}-cover.webp`),
                this.ossService.removeObject('shop', `${id}-cover-thumbnail.webp`),
                this.ossService.removeObject('shop', `${id}-detail.webp`),
                this.ossService.removeObject('shop', `${id}-detail-thumbnail.webp`),
                this.ossService.removeObject('shop', `${id}-license.webp`),
                this.ossService.removeObject('shop', `${id}-license-thumbnail.webp`),
            ])
        })
    }

    async updateShopProfile(currentUserId: string, id: string, request: UpdateShopProfile) {
        const { name, description, categories, address, opened, openTimeStart, openTimeEnd, deliveryThreshold, deliveryPrice, maximumDistance } = request
        let verified: boolean | undefined = request.verified
        return await this.prisma.$transaction(async tx => {
            const shop = await tx.shop.findUnique({ where: { id } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
            if (categories) {
                await Promise.all(categories.map(async id => {
                    const category = await tx.shopCategory.findUnique({ where: { id } })
                    if (!category) {
                        throw new ResponseError(404, 'Shop category not found')
                    }
                }))
            }
            if (currentUser.role !== 'ADMIN') {
                verified = undefined
            }
            return await tx.shop.update({
                where: { id },
                data: {
                    name,
                    description,
                    categories: { set: categories?.map(id => ({ id })) },
                    address: {
                        update: {
                            latitude: address?.coordinate?.[0],
                            longitude: address?.coordinate?.[1],
                            province: address?.province,
                            city: address?.city,
                            district: address?.district,
                            town: address?.town,
                            address: address?.address,
                            name: address?.name,
                            tel: address?.tel
                        }
                    },
                    verified,
                    opened,
                    openTimeStart,
                    openTimeEnd,
                    deliveryThreshold,
                    deliveryPrice,
                    maximumDistance
                },
                include: { categories: true, address: true }
            })
        })
    }

    readonly ossContentType = 'image/webp'

    async updateShopImage(currentUserId: string, id: string, cover: Buffer | undefined, detail: Buffer | undefined, license: Buffer | undefined) {
        await this.prisma.$transaction(async tx => {
            const shop = await tx.shop.findUnique({ where: { id } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
        })
        const tasks = []
        if (cover) {
            tasks.push(
                this.ossService.putObject('shop', `${id}-cover.webp`, sharp(cover).toFormat('webp'), this.ossContentType),
                this.ossService.putObject('shop', `${id}-cover-thumbnail.webp`, sharp(cover).resize(128, 128, { fit: 'outside' }).toFormat('webp'), this.ossContentType))
        }
        if (detail) {
            tasks.push(
                this.ossService.putObject('shop', `${id}-detail.webp`, sharp(detail).toFormat('webp'), this.ossContentType),
                this.ossService.putObject('shop', `${id}-detail-thumbnail.webp`, sharp(detail).resize(128, 128, { fit: 'outside' }).toFormat('webp'), this.ossContentType))
        }
        if (license) {
            tasks.push(
                this.ossService.putObject('shop', `${id}-license.webp`, sharp(license).toFormat('webp'), this.ossContentType),
                this.ossService.putObject('shop', `${id}-license-thumbnail.webp`, sharp(license).resize(128, 128, { fit: 'outside' }).toFormat('webp'), this.ossContentType))
        }
        await Promise.all(tasks)
    }

    async updateShopOwner(currentUserId: string, id: string, ownerId: string) {
        await this.prisma.$transaction(async tx => {
            const shop = await tx.shop.findUnique({ where: { id } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const currentUser = await tx.user.findUnique({ where: { id: currentUserId } })
            if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== shop.ownerId)) {
                throw new ResponseError(403, 'Permission denied')
            }
            const owner = await tx.user.findUnique({ where: { id: ownerId } })
            if (!owner) {
                throw new ResponseError(404, 'User not found')
            }
            await tx.shop.update({
                where: { id },
                data: { ownerId }
            })
        })
    }

}