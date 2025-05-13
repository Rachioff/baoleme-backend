import jwt, { JwtPayload } from 'jsonwebtoken'

export function generateAccessToken(userId: string, password: string) {
    return jwt.sign({ sub: userId, pwd: password }, process.env.JWT_SECRET!, { expiresIn: '100d' })
}

export function generateVerifyToken(userId: string) {
    return jwt.sign({ sub: userId, verify: true }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export function decodeVerifyToken(token: string): Promise<JwtPayload | null> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
            if (err || !decoded || typeof(decoded) === 'string' || !decoded.verify) {
                resolve(null)
            } else {
                resolve(decoded)
            }
        })
    })
}

export function generateUpdateEmailToken(userId: string, newEmail: string) {
    return jwt.sign({ sub: userId, email: newEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export function decodeUpdateEmailToken(token: string): Promise<(JwtPayload & { email: string }) | null> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
            if (err || !decoded || typeof(decoded) === 'string' || typeof(decoded.email) !== 'string') {
                resolve(null)
            } else {
                resolve({ ...decoded, email: decoded.email })
            }
        })
    })
}

export function generateResetPasswordToken(userId: string) {
    return jwt.sign({ sub: userId, resetPassword: true }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export function decodeResetPasswordToken(token: string): Promise<JwtPayload | null> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
            if (err || !decoded || typeof(decoded) === 'string' || !decoded.resetPassword) {
                resolve(null)
            } else {
                resolve(decoded)
            }
        })
    })
    
}