import { Client } from 'minio'
import { factoryInjection, factoryMethod } from '../util/injection-decorators'

class MinioFactory {

    @factoryMethod
    static makeMinio() {
        const minio = new Client({
            endPoint: process.env.MINIO_HOST!,
            port: Number(process.env.MINIO_PORT),
            useSSL: Boolean(process.env.MINIO_USE_SSL),
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRET_KEY
        })
        return minio
    }

}

export default factoryInjection(MinioFactory)

