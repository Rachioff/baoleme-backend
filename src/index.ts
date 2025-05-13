
import dotenv from 'dotenv'
import express from 'express'
import apiRoute from './route/api.route'

dotenv.config()

const app = express()
const port = process.env.APP_PORT

app.use('/api', apiRoute)

app.listen(port, () => {
    console.log(`${process.env.APP_NAME}`)
    console.log(`Server is running at http://localhost:${port}`)
})
