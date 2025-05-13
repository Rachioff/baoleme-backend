import express, { Router } from "express"
import helloController from "../controller/hello.controller"
import authController from "../controller/auth.controller"
import userController from "../controller/user.controller"
import { errorHandler } from "../middleware/errorhandler.middleware"

const router = Router()

router.use(express.json())
router.use('/', helloController)
router.use('/', authController)
router.use('/', userController)
router.use(errorHandler)

export default router