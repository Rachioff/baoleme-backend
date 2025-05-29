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
            '/items',
            authService.requireAuth(),
            validateQuery(ItemSchema.itemsQueryParams),
            async (req, res) => {
                const { p, pn} = req.query as unknown as ItemSchema.ItemsQueryParams
                const pageSkip = parseInt(p) * parseInt(pn)
                const pageLimit = parseInt(pn)
                const items = await itemService.getItems(pageSkip, pageLimit)
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
            '/items',
            upload.fields([
                {
                    name: 'cover',
                    maxCount: 1
                }
            ]),
            authService.requireAuth(),
            validateBody(ItemSchema.createItem),
            async (req, res) => {
                const request = req.body as ItemSchema.CreateItem
                const { cover } = req.files as {
                    cover?: Express.Multer.File[]
                }
                const item = await itemService.createItem(req.user!.id, request, cover?.[0]?.buffer)
                res.status(201).json(await itemService.itemDataToFullItemInfo(item))
            }
        )

        router.patch(
            '/items/:id',
            upload.fields([
                {
                    name: 'cover',
                    maxCount: 1
                }
            ]),
            authService.requireAuth(),
            validateParams(ItemSchema.itemIdParams),
            validateBody(ItemSchema.updateItem),
            async (req, res) => {
                const { id } = req.params
                let request = req.body as ItemSchema.UpdateItem
                const { cover } = req.files as {
                    cover?: Express.Multer.File[]
                }
                const updatedItem = await itemService.updateItem(req.user!.id, id, request, cover?.[0]?.buffer)
                res.status(200).json(await itemService.itemDataToFullItemInfo(updatedItem))
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