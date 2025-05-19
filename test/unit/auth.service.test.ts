import AuthService from '../../src/service/auth.service'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { any } from 'joi'

// 用于模拟 bcrypt
jest.mock('bcrypt')
// mock bcrypt.hash & compare
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

// 模拟 prisma 实例
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  }
}

type MockPrisma = {
  user: {
    create: jest.Mock,
    findUnique: jest.Mock,
    update: jest.Mock
  }
}
// // @ts-ignore
// authService.prisma = mockPrisma as unknown as PrismaClient


describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    // 注入 mock 的 prisma 实例
    // @ts-ignore - 绕过私有属性
    authService.prisma = mockPrisma as unknown as PrismaClient
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create user with hashed password', async () => {
    const email = 'test@example.com'
    const password = 'plainPassword'
    const hashedPassword = 'hashedPassword'
    
    // @ts-expect-error
    mockedBcrypt.compare.mockResolvedValue(true)

    const user = await authService.getUserByEmail(email, password)

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email } })
    expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
    expect(user?.email).toBe(email)
  })

  // it('should return user on correct password', async () => {
  //   const email = 'test@example.com'
  //   const password = 'plainPassword'
  //   const hashedPassword = 'hashedPassword'

  //   mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email, password: hashedPassword })
  //   mockedBcrypt.compare.mockResolvedValue(true)

  //   const user = await authService.getUserByEmail(email, password)

  //   expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email } })
  //   expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
  //   expect(user?.email).toBe(email)
  // })

  // it('should return null on incorrect password', async () => {
  //   const email = 'test@example.com'
  //   const password = 'wrongPassword'
  //   const hashedPassword = 'hashedPassword'

  //   mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email, password: hashedPassword })
  //   mockedBcrypt.compare.mockResolvedValue(false)

  //   const user = await authService.getUserByEmail(email, password)

  //   expect(user).toBeNull()
  // })

  // it('should update user password with hash', async () => {
  //   const id = 'user1'
  //   const newPassword = 'newPassword'
  //   const hashed = 'hashedNewPassword'

  //   mockedBcrypt.hash.mockResolvedValue(hashed)
  //   mockPrisma.user.update.mockResolvedValue({ id, email: 'xx@example.com', password: hashed })

  //   const updatedUser = await authService.updateUserPassword(id, newPassword)

  //   expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10)
  //   expect(mockPrisma.user.update).toHaveBeenCalledWith({
  //     where: { id },
  //     data: { password: hashed }
  //   })
  //   expect(updatedUser.password).toBe(hashed)
  // })
})
function beforeEach(arg0: () => void) {
  throw new Error('Function not implemented.')
}

