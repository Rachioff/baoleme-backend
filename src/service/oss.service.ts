import { Client } from 'minio'
import stream from 'stream'
import { classInjection, injected } from '../util/injection-decorators'

@classInjection
export default class OSSService {

    @injected
    private minio!: Client

    async createBucketIfNotExist(bucketName: string) {
        if (!await this.minio.bucketExists(bucketName)) {
            await this.minio.makeBucket(bucketName)
            return true
        }
        return false
    }

    async existsObject(bucketName: string, objectName: string) {
        return (await this.minio.listObjects(bucketName, objectName, false).toArray()).length > 0
    }

    async getObjectUrl(bucketName: string, objectName: string) {
        return await this.minio.presignedGetObject(bucketName, objectName)
    }

    async putObject(bucketName: string, objectName: string, buffer: stream.Readable | Buffer | string, contentType?: string) {
        await this.minio.putObject(bucketName, objectName, buffer, undefined, contentType ? { 'Content-Type': contentType } : undefined)
        return await this.getObjectUrl(bucketName, objectName)
    }

    async removeObject(bucketName: string, objectName: string) {
        await this.minio.removeObject(bucketName, objectName)
    }

}