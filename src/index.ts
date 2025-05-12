
import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import { errorHandler } from './middleware/errorhandler.middleware'
import apiRoute from './route/api.route'

console.log('JWT_SECRET:', process.env.JWT_SECRET);
const app = express()
const port = process.env.APP_PORT

app.use(express.json())
app.use('/api', apiRoute)
app.use(errorHandler)

app.listen(port, () => {
    console.log(`${process.env.APP_NAME}`)
    console.log(`Server is running at http://localhost:${port}`)
})
