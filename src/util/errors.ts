export class ResponseError extends Error {

    public constructor(status: number, message: string) {
        super(message)
        this.m_status = status
    }

    public get status() {
        return this.m_status
    }

    private m_status: number
}