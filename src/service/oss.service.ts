import { Client } from 'minio'
import stream from 'stream'

const minioClient = new Client({
    endPoint: process.env.MINIO_HOST!,
    port: Number(process.env.MINIO_PORT),
    useSSL: Boolean(process.env.MINIO_USE_SSL),
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
})

export async function createBucketIfNotExist(bucketName: string) {
    if (!await minioClient.bucketExists(bucketName)) {
        await minioClient.makeBucket(bucketName)
        return true
    }
    return false
}

export async function existsObject(bucketName: string, objectName: string) {
    return (await minioClient.listObjects(bucketName, objectName, false).toArray()).length > 0
}

export async function getObjectUrl(bucketName: string, objectName: string) {
    return await minioClient.presignedGetObject(bucketName, objectName)
}

export async function putObject(bucketName: string, objectName: string, buffer: stream.Readable | Buffer | string) {
    await minioClient.putObject(bucketName, objectName, buffer)
    return await getObjectUrl(bucketName, objectName)
}

export async function removeObject(bucketName: string, objectName: string) {
    await minioClient.removeObject(bucketName, objectName)
}