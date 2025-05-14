
import dotenv from 'dotenv'
import initializeRoutine from './app/initializeRoutine'
import app from './app/app'
import logger from './app/logger'

dotenv.config()
const port = process.env.APP_PORT

logger.info(`${process.env.APP_NAME} has started`)

logger.info(`Initializing...`)

initializeRoutine.run().then(() => {
    logger.info(`Initializing finished, starting listening...`)
    app.listen(port, () => {
        logger.info(`Server is running at http://localhost:${port}`)
    })
}).catch(err => {
    logger.error({ err }, `Error during initialization`)
    process.exit(1)
})
