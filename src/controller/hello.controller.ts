import { Router } from 'express'
import { ResponseError } from '../util/errors'

const router = Router()

router.get(
    '/hello',
    async (req, res) => {
        res.json({ 'message': 'Hello World!' })
    }
)

router.get(
    '/hello/teapot',
    async (req, res) => {
        throw new ResponseError(418, "I'm a teapot")
    }
)

export default router
