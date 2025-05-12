import { Router } from "express"
import { getRouter } from "../util/decorators"
import HelloController from "../controller/hello.controller"
import AuthController from "../controller/auth.controller"
import UserController from "../controller/user.controller"

const router = Router()

router.use('/', getRouter(HelloController))
router.use('/', getRouter(AuthController))
router.use('/', getRouter(UserController))

export default router