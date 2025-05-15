import pino from 'pino'
import { factoryInjection, factoryMethod } from '../util/injection-decorators'

class LoggerFactory {

    @factoryMethod
    static makeLogger() {
        const logger = pino()
        return logger
    }

}

export default factoryInjection(LoggerFactory)
