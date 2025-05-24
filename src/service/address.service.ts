// 文件: src/service/address.service.ts
import { PrismaClient, Address, Prisma } from '@prisma/client';
import { Logger } from 'pino';
import { classInjection, injected } from '../util/injection-decorators';
import { ResponseError } from '../util/errors';

import { CreateAddressApiDto, UpdateAddressApiDto, UpdateAddressOrderDto } from '../schema/address.schema';

const MAX_ADDRESSES_PER_USER = 16;

export interface ApiAddressResponse {
    id: string;
    coordinate: [number | null, number | null];
    province: string;
    city: string;
    district: string;
    town: string | null;
    address: string;
    name: string;
    tel: string;
    isDefault: boolean;
}

@classInjection
export default class AddressService {
    @injected('logger', true)
    private logger!: Logger;

    @injected
    private prisma!: PrismaClient;

    private mapDbAddressToApiResponse(dbAddress: Address): ApiAddressResponse {
        return {
            id: dbAddress.id,
            coordinate: [dbAddress.longitude ?? null, dbAddress.latitude ?? null],
            province: dbAddress.province,
            city: dbAddress.city,
            district: dbAddress.district,
            town: dbAddress.town ?? "",
            address: dbAddress.detailedAddress,
            name: dbAddress.recipientName,
            tel: dbAddress.phoneNumber,
            isDefault: dbAddress.isDefault,
        };
    }

    /**
     * 一个辅助方法：重新调整用户地址的 sortOrder
     */
    private async reorderSortOrders(
        tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
        userId: string
    ): Promise<void> {
        const addresses = await tx.address.findMany({
            where: { userId },
            orderBy: { sortOrder: 'asc' },
        });
        for (let i = 0; i < addresses.length; i++) {
            if (addresses[i].sortOrder !== i) {
                await tx.address.update({ where: { id: addresses[i].id }, data: { sortOrder: i } });
            }
        }
    }

    async addAddress(userId: string, apiAddressData: CreateAddressApiDto): Promise<ApiAddressResponse> {
        this.logger.info({ userId, apiAddressData }, '尝试添加地址');
        const [longitude, latitude] = apiAddressData.coordinate;

        const newDbAddress = await this.prisma.$transaction(async (tx) => {
            const currentAddresses = await tx.address.findMany({
                where: { userId },
                orderBy: { sortOrder: 'asc' },
            });

            if (currentAddresses.length >= MAX_ADDRESSES_PER_USER) {
                throw new ResponseError(400, `一个用户最多只能拥有 ${MAX_ADDRESSES_PER_USER} 个收货地址`);
            }

            if (apiAddressData.isDefault) {
                await tx.address.updateMany({
                    where: { userId: userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            // 新地址总是添加到末尾
            const targetSortOrder = currentAddresses.length;

            const createdAddress = await tx.address.create({
                data: {
                    userId,
                    recipientName: apiAddressData.name,
                    phoneNumber: apiAddressData.tel,
                    province: apiAddressData.province,
                    city: apiAddressData.city,
                    district: apiAddressData.district,
                    town: apiAddressData.town,
                    detailedAddress: apiAddressData.address,
                    longitude,
                    latitude,
                    isDefault: apiAddressData.isDefault,
                    sortOrder: targetSortOrder,
                },
            });
            return createdAddress;
        });
        return this.mapDbAddressToApiResponse(newDbAddress);
    }

    async getAddresses(userId: string): Promise<ApiAddressResponse[]> {
        this.logger.info({ userId }, '获取用户地址列表');
        const dbAddresses = await this.prisma.address.findMany({
            where: { userId },
            orderBy: { sortOrder: 'asc' },
        });
        return dbAddresses.map(addr => this.mapDbAddressToApiResponse(addr));
    }

    async getAddressById(currentUserId: string, addressId: string): Promise<ApiAddressResponse> {
        this.logger.info({ currentUserId, addressId }, '获取单个地址信息');
        const dbAddress = await this.prisma.address.findUnique({
            where: { id: addressId },
        });

        if (!dbAddress) {
            throw new ResponseError(404, '收货地址未找到');
        }
        if (dbAddress.userId !== currentUserId) {

            this.logger.warn({ currentUserId, addressOwnerId: dbAddress.userId }, '尝试获取他人地址信息');
            throw new ResponseError(403, '无权查看此地址');
        }
        return this.mapDbAddressToApiResponse(dbAddress);
    }

    async updateAddress(currentUserId: string, addressId: string, apiAddressData: UpdateAddressApiDto): Promise<ApiAddressResponse> {
        this.logger.info({ currentUserId, addressId, apiAddressData }, '尝试更新地址');
        
        const dataToUpdate: Prisma.AddressUpdateInput = {};
        if (apiAddressData.name !== undefined) dataToUpdate.recipientName = apiAddressData.name;
        if (apiAddressData.tel !== undefined) dataToUpdate.phoneNumber = apiAddressData.tel;
        if (apiAddressData.province !== undefined) dataToUpdate.province = apiAddressData.province;
        if (apiAddressData.city !== undefined) dataToUpdate.city = apiAddressData.city;
        if (apiAddressData.district !== undefined) dataToUpdate.district = apiAddressData.district;
        if (apiAddressData.town !== undefined) dataToUpdate.town = apiAddressData.town;
        if (apiAddressData.address !== undefined) dataToUpdate.detailedAddress = apiAddressData.address;
        if (apiAddressData.coordinate) {
            dataToUpdate.longitude = apiAddressData.coordinate[0];
            dataToUpdate.latitude = apiAddressData.coordinate[1];
        }
        if (apiAddressData.isDefault !== undefined) dataToUpdate.isDefault = apiAddressData.isDefault;

        if (Object.keys(dataToUpdate).length === 0) {
            throw new ResponseError(400, '没有提供任何需要更新的字段');
        }

        const updatedDbAddress = await this.prisma.$transaction(async (tx) => {
            const existingAddress = await tx.address.findUnique({ where: { id: addressId } });

            if (!existingAddress) throw new ResponseError(404, '收货地址未找到');
            if (existingAddress.userId !== currentUserId) throw new ResponseError(403, '无权修改此地址');

            if (typeof apiAddressData.isDefault === 'boolean' && apiAddressData.isDefault) {
                if (!existingAddress.isDefault || (Object.keys(dataToUpdate).length > 1) ) { // 确保只在需要时或有其他更新时执行
                    await tx.address.updateMany({
                        where: { userId: currentUserId, isDefault: true, NOT: { id: addressId } },
                        data: { isDefault: false },
                    });
                }
            }

            return tx.address.update({ where: { id: addressId }, data: dataToUpdate });
        });
        return this.mapDbAddressToApiResponse(updatedDbAddress);
    }

    async updateAddressOrder(currentUserId: string, addressIdToMove: string, orderData: UpdateAddressOrderDto): Promise<ApiAddressResponse[]> {
        this.logger.info({ currentUserId, addressIdToMove, orderData }, '尝试更新地址次序');

        return this.prisma.$transaction(async (tx) => {
            const addresses = await tx.address.findMany({
                where: { userId: currentUserId },
                orderBy: { sortOrder: 'asc' },
            });

            const addressToMove = addresses.find(addr => addr.id === addressIdToMove);
            if (!addressToMove) {
                throw new ResponseError(404, '需要移动的地址未找到');
            }

            const remainingAddresses = addresses.filter(addr => addr.id !== addressIdToMove);
            let targetIndex: number;

            if (orderData.before === null) {
                targetIndex = remainingAddresses.length;
            } else {
                targetIndex = remainingAddresses.findIndex(addr => addr.id === orderData.before);
                if (targetIndex === -1) {
                    throw new ResponseError(400, '目标位置 (before) 地址未找到');
                }
            }

            remainingAddresses.splice(targetIndex, 0, addressToMove);

            for (let i = 0; i < remainingAddresses.length; i++) {
                if (remainingAddresses[i].sortOrder !== i) {
                    await tx.address.update({
                        where: { id: remainingAddresses[i].id },
                        data: { sortOrder: i },
                    });
                }
            }
            const updatedAddresses = await tx.address.findMany({
                where: {userId: currentUserId},
                orderBy: {sortOrder: 'asc'}
            });
            return updatedAddresses.map(addr => this.mapDbAddressToApiResponse(addr));
        });
    }

    async deleteAddress(currentUserId: string, addressId: string): Promise<void> {
        this.logger.info({ currentUserId, addressId }, '尝试删除地址');

        await this.prisma.$transaction(async (tx) => {
            const addressToDelete = await tx.address.findUnique({ where: { id: addressId } });

            if (!addressToDelete) throw new ResponseError(404, '收货地址未找到');
            if (addressToDelete.userId !== currentUserId) throw new ResponseError(403, '无权删除此地址');

            await tx.address.delete({ where: { id: addressId } });

            if (addressToDelete.isDefault) {
                const nextDefaultAddress = await tx.address.findFirst({
                    where: { userId: currentUserId },
                    orderBy: { sortOrder: 'asc' },
                });
                if (nextDefaultAddress) {
                    await tx.address.update({
                        where: { id: nextDefaultAddress.id },
                        data: { isDefault: true },
                    });
                }
            }
            await this.reorderSortOrders(tx, currentUserId);
        });
    }

    async setDefaultAddress(currentUserId: string, addressId: string): Promise<ApiAddressResponse> {
        this.logger.info({ currentUserId, addressId }, '尝试设置默认地址');

        const updatedDbAddress = await this.prisma.$transaction(async (tx) => {
            const addressToSetDefault = await tx.address.findUnique({ where: { id: addressId } });

            if (!addressToSetDefault) throw new ResponseError(404, '收货地址未找到');
            if (addressToSetDefault.userId !== currentUserId) throw new ResponseError(403, '无权操作此地址');
            if (addressToSetDefault.isDefault) return addressToSetDefault;

            await tx.address.updateMany({
                where: { userId: currentUserId, isDefault: true },
                data: { isDefault: false },
            });
            return tx.address.update({
                where: { id: addressId },
                data: { isDefault: true },
            });
        });
        return this.mapDbAddressToApiResponse(updatedDbAddress);
    }
}