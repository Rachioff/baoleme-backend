import { Router } from 'express'
import * as ItemSchema from '../schema/item.schema'
import AuthService from '../service/auth.service'
import ItemService from '../service/item.service'
import { acceptMaximumSize, acceptMimeTypes, validateBody, validateParams, validateQuery, validateImage } from '../middleware/validator.middleware'
import { factoryInjection, factoryMethod, injected } from '../util/injection-decorators'
import upload from '../middleware/upload.middleware'

class ItemController {
    @factoryMethod
    static itemController(
        @injected('authService') authService: AuthService,
        @injected('itemService') itemService: ItemService,
    ) {
        const router = Router()

        router.get(
            '/shops/{shopId}/item-categories/{categoryId}/items',
            authService.requireAuth(),
            validateParams(ItemSchema.shopIdAndcategoryIdParams),
            async (req, res) => {
                const { shopId, categoryId } = req.params
                const categories = await itemService.getItemCategory(shopId,categoryId)
                const items = await itemService.getShopCategoryItems(shopId, categoryId)
                res.status(200).json(await Promise.all(items.map(async item => itemService.itemDataToFullItemInfo(item))))
            }
        )
        router.get(
            '/shops/:shopId/items',
            authService.requireAuth(),
            validateQuery(ItemSchema.itemsQueryParams),
            async (req, res) => {
                const {shopId} = req.params
                const items = await itemService.getItems(shopId)
                res.status(200).json(await Promise.all(items.map(async item => itemService.itemDataToFullItemInfo(item))))
            }
        )

        router.get(
            '/items/:id',
            authService.requireAuth(),
            validateParams(ItemSchema.itemIdParams),
            async (req, res) => {
                const { id } = req.params
                const item = await itemService.getItem(id)
                res.status(200).json(await itemService.itemDataToFullItemInfo(item))
            }
        )

        router.post(
            '/shops/:shopId/items',
            upload.single('cover'),
            authService.requireAuth(),
            validateBody(ItemSchema.createItem),
            async (req, res) => {
                const {shopId}= req.params
                const request = req.body as ItemSchema.CreateItem
                const { cover } = req.files as {
                    cover?: Express.Multer.File[]
                }
                const item = await itemService.createItem(req.user!.id, shopId,request, cover?.[0]?.buffer)
                res.status(201).json(await itemService.itemDataToFullItemInfo(item))
            }
        )

        router.patch(
            '/items/:id/profile',
            authService.requireAuth(),
            validateParams(ItemSchema.itemIdParams),
            validateBody(ItemSchema.updateItemProfile),
            async (req, res) => {
                const { id } = req.params
                let request = req.body as ItemSchema.UpdateItemProfile
                const updatedItem = await itemService.updateItemProfile(req.user!.id, id, request)
                res.status(200).json(await itemService.itemDataToItemProfile(updatedItem))
            }
        )

        router.patch(
            '/items/:id/cover',
            upload.single('cover'),
            authService.requireAuth(),
            validateParams(ItemSchema.itemIdParams),
            acceptMimeTypes(/^image\//),
            acceptMaximumSize(4 * 1024 * 1024),
            validateImage(),
            async (req, res) => {
                const { id } = req.params
                const { cover} = req.files as {
                    cover?: Express.Multer.File[]
                }
                await itemService.updateItemImage(req.user!.id,id,cover?.[0].buffer)
                    res.status(200).json(await itemService.getItemImageLinks(id))
                }
        )

        router.delete(
            '/items/:id',
            authService.requireAuth(),
            validateParams(ItemSchema.itemIdParams),
            async (req, res) => {
                const { id } = req.params
                await itemService.deleteItem(req.user!.id, id)
                res.status(204).send()
            }
        )
        return router
    }
}

export default factoryInjection(ItemController) 