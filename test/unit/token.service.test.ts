import TokenService from '../../src/service/token.service'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll } from '@jest/globals'

// 测试框架：
describe('TokenService', () => {
  // 先准备测试数据
  let tokenService: TokenService
  const JWT_SECRET = 'test-secret'
  const userId = 'user123'
  const password = 'password123'
  const newEmail = 'new@example.com'

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET
    tokenService = new TokenService()
  })
  // 设置提示信息，在回调函数中调用测试模块
  it('should generate a valid access token', () => {
    const token = tokenService.generateAccessToken(userId, password)
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    // 检查 token 是否有效
    expect(decoded.sub).toBe(userId)
    expect(decoded.pwd).toBe(password)
  })

  it('should generate a valid verify token and decode it', async () => {
    const token = tokenService.generateVerifyToken(userId)
    const decoded = await tokenService.decodeVerifyToken(token)

    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe(userId)
    expect(decoded?.verify).toBe(true)
  })

  it('should return null for invalid verify token', async () => {
    const token = jwt.sign({ sub: userId }, JWT_SECRET) // 没有 verify 字段
    const result = await tokenService.decodeVerifyToken(token)

    expect(result).toBeNull()
  })

  it('should generate a valid update email token and decode it', async () => {
    const token = tokenService.generateUpdateEmailToken(userId, newEmail)
    const decoded = await tokenService.decodeUpdateEmailToken(token)

    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe(userId)
    expect(decoded?.email).toBe(newEmail)
  })

  it('should return null for invalid update email token', async () => {
    const invalidToken = jwt.sign({ sub: userId }, JWT_SECRET) // 缺 email 字段
    const result = await tokenService.decodeUpdateEmailToken(invalidToken)

    expect(result).toBeNull()
  })

  it('should generate a valid reset password token and decode it', async () => {
    const token = tokenService.generateResetPasswordToken(userId)
    const decoded = await tokenService.decodeResetPasswordToken(token)

    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe(userId)
    expect(decoded?.resetPassword).toBe(true)
  })

  it('should return null for invalid reset password token', async () => {
    const token = jwt.sign({ sub: userId }, JWT_SECRET) // 没有 resetPassword 字段
    const result = await tokenService.decodeResetPasswordToken(token)

    expect(result).toBeNull()
  })

  it('should return null when decoding invalid JWT', async () => {
    const invalidToken = 'invalid.jwt.token'
    const result = await tokenService.decodeVerifyToken(invalidToken)
    expect(result).toBeNull()
  })
})
