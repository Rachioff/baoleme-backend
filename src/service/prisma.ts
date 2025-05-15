import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { asyncInitializeRoutine } from '../app/container';
import { factoryInjection, factoryMethod, injected } from '../util/injection-decorators';

class PrismaFactory {

    @factoryMethod
    static makePrisma(@injected('logger', true) logger: Logger) {
        const prisma = new PrismaClient()

        asyncInitializeRoutine.addInitializer(async () => {
            try {
                logger.info('Checking Prisma connection')
                await prisma.$connect()
                logger.info('Prisma connection test OK')
            } catch (err) {
                logger.error({ err }, 'Prisma connection test failed')
                process.exit(1)
            }
        })

        return prisma
    }

}

export default factoryInjection(PrismaFactory)
