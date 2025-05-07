import jwt from 'jsonwebtoken'

export function generateAccessToken(userId: string, password: string) {
    return jwt.sign({ sub: userId, pwd: password }, process.env.JWT_SECRET!, { expiresIn: '100d' })
};

export function generateVerifyToken(userId: string) {
    return jwt.sign({ sub: userId, verify: true }, process.env.JWT_SECRET!, { expiresIn: '1h' })
};

export function generateUpdateEmailToken(userId: string, newEmail: string) {
    return jwt.sign({ sub: userId, email: newEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' })
};