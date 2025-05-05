import express from 'express'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorhandler.middleware'
import helloRoute from './route/hello.route'

dotenv.config()

const app = express()
const port = process.env.APP_PORT

app.use('/api/hello', helloRoute)
app.use(errorHandler)

app.listen(port, () => {
    console.log(`${process.env.APP_NAME}`)
    console.log(`Server is running at http://localhost:${port}`)
})