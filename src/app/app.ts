import express from 'express'
import apiRoute from '../route/api.route'

const app = express()

app.use('/api', apiRoute)

export default app