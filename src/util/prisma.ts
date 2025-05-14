import { PrismaClient } from '@prisma/client';
import initializeRoutine from '../app/initializeRoutine';
import logger from '../app/logger';

const prisma = new PrismaClient()

initializeRoutine.addAsyncRoutine(async () => {
    await prisma.$connect()
    logger.info('Prisma connect test OK')
})

export function getPrismaClient() {
    return prisma
}