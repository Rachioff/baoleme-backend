import { Prisma, PrismaClient } from '@prisma/client'
import { classInjection, injected } from '../util/injection-decorators'
import { ResponseError } from '../util/errors'
import OSSService from './oss.service'

@classInjection
export default class OrderService {

    @injected
    private prisma!: PrismaClient

    @injected
    private ossService!: OSSService

    async orderDataToOrderInfo(order: Prisma.OrderGetPayload<{ include: { items: true } }>) {
        return {
            id: order.id,
            status: order.status.toLowerCase(),
            createdAt: order.createdAt,
            paidAt: order.paidAt,
            preparedAt: order.preparedAt,
            deliveredAt: order.deliveredAt,
            finishedAt: order.finishedAt,
            canceledAt: order.canceledAt,
            customer: order.customerId,
            shop: order.shopId,
            rider: order.riderId,
            items: await Promise.all(order.items.map(async item => ({
                id: item.itemId,
                name: item.name,
                cover: await this.getOrderItemCoverLinks(item.id),
                quantity: item.quantity,
                price: item.price,
            }))),
            deliveryFee: order.deliveryFee,
            total: order.total,
            note: order.note,
            delivery: (order.deliveryLatitude !== null && order.deliveryLongitude != null) ? {
                latitude: order.deliveryLatitude,
                longitude: order.deliveryLongitude,
            } : null,
            shopAddress: {
                coordinate: [order.shopLatitude, order.shopLongitude],
                province: order.shopProvince,
                city: order.shopCity,
                district: order.shopDistrict,
                town: order.shopTown,
                address: order.shopAddress,
                name: order.shopName,
                tel: order.shopTel,
            },
            customerAddress: {
                coordinate: [order.customerLatitude, order.customerLongitude],
                province: order.customerProvince,
                city: order.customerCity,
                district: order.customerDistrict,
                town: order.customerTown,
                address: order.customerAddress,
                name: order.customerName,
                tel: order.customerTel,
            }
        }
    }

    orderDataToOmittedOrderInfo(order: Prisma.OrderGetPayload<{ include: { items: true } }>) {
        return {
            id: order.id,
            status: order.status.toLowerCase(),
            preparedAt: order.preparedAt,
            shopAddress: {
                coordinate: [order.shopLatitude, order.shopLongitude],
                province: order.shopProvince,
                city: order.shopCity,
                district: order.shopDistrict,
                town: order.shopTown,
                address: order.shopAddress,
                name: order.shopName,
                tel: order.shopTel,
            },
            customerAddress: {
                coordinate: [order.customerLatitude, order.customerLongitude],
                province: order.customerProvince,
                city: order.customerCity,
                district: order.customerDistrict,
                town: order.customerTown,
                address: order.customerAddress,
                name: order.customerName,
                tel: order.customerTel,
            }
        }
    }

    async getOrderItemCoverLinks(id: string) {
        const [origin, thumbnail] = await Promise.all([
            this.ossService.getObjectUrl(`order-items/${id}/cover.webp`),
            this.ossService.getObjectUrl(`order-items/${id}/cover-thumbnail.webp`)])
        return { origin, thumbnail }
    }

    async getOrders(currentUserId: string, pageSkip: number, pageLimit: number) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            if (!currentUser || currentUser.role !== 'ADMIN') {
                throw new ResponseError(403, 'Permission denied')
            }
            return await tx.order.findMany({
                skip: pageSkip,
                take: pageLimit,
                orderBy: { createdAt: 'desc' },
                include: { items: true },
            })
        })
    }

    async createOrder(currentUserId: string, shopId: string, addressId: string, note: string) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            if (!currentUser) {
                throw new ResponseError(401, 'Unauthorized')
            }
            const shop = await tx.shop.findUnique({ where: { id: shopId } })
            if (!shop) {
                throw new ResponseError(404, 'Shop not found')
            }
            const cartItems = await tx.cartItem.findMany({
                where: {
                    customerId: currentUserId,
                    item: { shopId }
                },
                include: { item: true },
            })
            if (cartItems.length === 0) {
                throw new ResponseError(400, 'Cart is empty')
            }
            const address = await tx.address.findUnique({
                where: { id: addressId, userId: currentUserId },
            })
            if (!address) {
                throw new ResponseError(404, 'Address not found')
            }
            const orderItems = cartItems.map(item => ({
                itemId: item.itemId,
                name: item.item.name,
                quantity: item.quantity,
                price: item.item.price * item.quantity,
            }))
            
            return await tx.order.create({
                data: {
                    customerId: currentUserId,
                    shopId,
                    deliveryFee: shop.deliveryPrice,
                    total: shop.deliveryPrice + orderItems.reduce((sum, item) => sum + item.price, 0),
                    note,
                    items: { create: orderItems },
                    shopLatitude: shop.addressLatitude,
                    shopLongitude: shop.addressLongitude,
                    shopProvince: shop.addressProvince,
                    shopCity: shop.addressCity,
                    shopDistrict: shop.addressDistrict,
                    shopTown: shop.addressTown,
                    shopAddress: shop.addressAddress,
                    shopName: shop.addressName,
                    shopTel: shop.addressTel,
                    customerLatitude: address.latitude,
                    customerLongitude: address.longitude,
                    customerProvince: address.province,
                    customerCity: address.city,
                    customerDistrict: address.district,
                    customerTown: address.town,
                    customerAddress: address.detail,
                    customerName: address.recipientName,
                    customerTel: address.phoneNumber,
                },
                include: { items: true },
            })
        })
    }

    async getOrder(currentUserId: string, id: string) {
        return await this.prisma.$transaction(async tx => {
            const currentUser = await tx.user.findUnique({
                where: { id: currentUserId },
            })
            if (!currentUser) {
                throw new ResponseError(401, 'Unauthorized')
            }
            const order = await tx.order.findUnique({
                where: { id },
                include: { items: true, shop: true },
            })
            if (!order) {
                throw new ResponseError(404, 'Order not found')
            }
            let doOmit = false
            if (order.customerId !== currentUserId && order.shop?.ownerId !== currentUserId && order.riderId !== currentUserId && currentUser.role !== 'ADMIN') {
                if (order.status !== 'PREPARED') {
                    throw new ResponseError(403, 'Permission denied')
                } else {
                    doOmit = true
                }
            }
            return { order, doOmit }
        })
    }

}