import { Router } from "express"
import * as helloController from '../controller/hello.controller'

const router = Router()

router.get('/', helloController.hello)
router.get('/teapot', helloController.teapot)

export default router