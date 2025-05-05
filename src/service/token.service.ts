import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId: number, password: string) => {
    return jwt.sign({ sub: userId, pwd: password }, process.env.JWT_SECRET!, { expiresIn: '100d' })
};

export const generateResetToken = (userId: number) => {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' })
};