import { Router } from "express";
import { factoryInjection, factoryMethod, injected } from "../util/injection-decorators";
import AuthService from "../service/auth.service";
import * as UserSchema from "../schema/user.schema";
import * as ShopSchema from "../schema/shop.schema";
import { acceptMaximumSize, acceptMimeTypes, validateBody, validateImage, validateParams, validateQuery } from "../middleware/validator.middleware";
import UserService from "../service/user.service";
import ShopService from "../service/shop.service";
import upload from "../middleware/upload.middleware";
import { PrismaClient } from "@prisma/client";

class ShopController {

    @factoryMethod
    static shopController(
        @injected('authService') authService: AuthService,
        @injected('userService') userService: UserService,
        @injected('shopService') shopService: ShopService,
    ) {
        const router = Router()

        router.get(
            '/shops',
            authService.requireAuth(),
            userService.requireAdmin(),
            validateQuery(ShopSchema.getShopsQuery),
            async (req, res) => {
                const { p, pn, q, min_ca, max_ca } = req.query as unknown as ShopSchema.GetShopsQuery
                const pageSkip = parseInt(p) * parseInt(pn)
                const pageLimit = parseInt(pn)
                const filterKeywords = q.split(' ').filter(s => s.length > 0)
                const minCreatedAt = min_ca ? new Date(min_ca) : undefined
                const maxCreatedAt = max_ca ? new Date(max_ca) : undefined
                const shops = await shopService.getFilteredGlobalShops(pageSkip, pageLimit, filterKeywords, minCreatedAt, maxCreatedAt)
                res.status(200).json(await Promise.all(shops.map(async shop => shopService.shopDataToFullShopInfo(shop))))
            }
        )

        router.get(
            '/user/:id/shops',
            authService.requireAuth(),
            validateParams(UserSchema.userProfileParams),
            async (req, res) => {
                const { id } = req.params
                const user = await authService.getUserByIdOrElse404(id)
                const shops = await shopService.getShopsByOwnerId(user.id)
                res.status(200).json(await Promise.all(shops.map(async shop => shopService.shopDataToFullShopInfo(shop))))
            }
        )

        router.post(
            '/shops',
            authService.requireAuth(),
            validateBody(ShopSchema.createShop),
            async (req, res) => {
                const request = req.body as ShopSchema.CreateShop
                const user = req.user!
                await Promise.all(request.categories.map(async category => shopService.getShopCategoryOrElse404(category)))
                const shop = await shopService.createShop(user.id, request)
                res.status(201).json(await shopService.shopDataToFullShopInfo(shop))
            }
        )

        router.get(
            '/shops/:id',
            authService.requireAuth(),
            validateParams(ShopSchema.shopIdParams),
            async (req, res) => {
                const { id } = req.params
                const shop = await shopService.getShopOrElse404(id)
                res.status(200).json(await shopService.shopDataToFullShopInfo(shop))
            }
        )

        router.delete(
            '/shops/:id',
            authService.requireAuth(),
            validateParams(ShopSchema.shopIdParams),
            async (req, res) => {
                const { id } = req.params
                const user = req.user!
                const shop = await shopService.getShopOrElse404(id)
                shopService.hasShopModifyPermissionOrElse403(user, shop)
                await shopService.checkShopDeletableOrElse409(shop)
                await shopService.deleteShop(id)
                res.status(204).send()
            }
        )

        router.patch(
            '/shops/:id/profile',
            authService.requireAuth(),
            validateParams(ShopSchema.shopIdParams),
            validateBody(ShopSchema.updateShopProfile),
            async (req, res) => {
                const { id } = req.params
                let request = req.body as ShopSchema.UpdateShopProfile
                const user = req.user!
                const shop = await shopService.getShopOrElse404(id)
                shopService.hasShopModifyPermissionOrElse403(user, shop)
                if (request.categories) {
                    await Promise.all(request.categories.map(async category => shopService.getShopCategoryOrElse404(category)))
                }
                if (user.role !== 'ADMIN') {
                    request.verified = undefined
                }
                const updatedShop = await shopService.updateShopProfile(shop.id, request)
                res.status(200).json(shopService.shopDataToShopProfile(updatedShop))
            }
        )

        router.patch(
            '/shops/:id/image',
            upload.fields([
                {
                    name: 'cover',
                    maxCount: 1
                },
                {
                    name: 'detailImage',
                    maxCount: 1
                },
                {
                    name: 'license',
                    maxCount: 1
                }
            ]),
            authService.requireAuth(),
            validateParams(ShopSchema.shopIdParams),
            acceptMimeTypes(/^image\//),
            acceptMaximumSize(4 * 1024 * 1024),
            validateImage(),
            async (req, res) => {
                const { id } = req.params
                const user = req.user!
                const shop = await shopService.getShopOrElse404(id)
                shopService.hasShopModifyPermissionOrElse403(user, shop)
                const { cover, detailImage, license } = req.files as {
                    cover?: Express.Multer.File[]
                    detailImage?: Express.Multer.File[]
                    license?: Express.Multer.File[]
                }
                await shopService.updateShopImage(shop.id, cover?.[0].buffer, detailImage?.[0].buffer, license?.[0].buffer)
                res.status(200).json(await shopService.getShopImageLinks(shop.id))
            }
        )

        router.patch(
            '/shops/:id/owner',
            authService.requireAuth(),
            validateParams(ShopSchema.shopIdParams),
            validateBody(ShopSchema.updateShopOwner),
            async (req, res) => {
                const { id } = req.params
                const { owner } = req.body as ShopSchema.UpdateShopOwner
                const user = req.user!
                const shop = await shopService.getShopOrElse404(id)
                shopService.hasShopModifyPermissionOrElse403(user, shop)
                const newOwner = await authService.getUserByIdOrElse404(owner)
                await shopService.updateShopOwner(shop.id, newOwner.id)
                res.status(200).json(await shopService.shopDataToFullShopInfo(shop))
            }
        )

        return router
    }

}

export default factoryInjection(ShopController)