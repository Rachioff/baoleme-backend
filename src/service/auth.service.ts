import bcrypt from 'bcrypt'
import { PrismaClient, User } from '@prisma/client'
import passport from 'passport'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { ResponseError } from '../util/errors'
import { classInjection, injected } from '../util/injection-decorators'

const SALT_ROUNDS = 10

@classInjection
export default class AuthService {

    @injected
    private prisma!: PrismaClient

    private passport: passport.Authenticator

    constructor() {
        this.passport = new passport.Authenticator()
        const jwtOptions = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET!
        }

        this.passport.use(new JWTStrategy(jwtOptions, async (payload, done) => {
            try {
                const user = await this.getUserById(payload.sub, payload.pwd)
                return user ? done(null, user) : done(new ResponseError(401, 'Unauthorized'))
            } catch (error) {
                return done(new ResponseError(401, 'Unauthorized'))
            }
        }))
    }

    requireAuth() {
        return this.passport.authenticate('jwt', { session: false, failWithError: true })
    }

    async getUserById(id: string, encryptedPassword?: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { id } })
        if (user && encryptedPassword && encryptedPassword !== user?.password) {
            return null
        }
        return user
    }

    async getUserByIdOrElse404(id: string): Promise<User> {
        const user = await this.getUserById(id)
        if (!user) {
            throw new ResponseError(404, 'User not found')
        }
        return user
    }

    async getUserByEmail(email: string, password?: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { email } })
        if (user && password && !await bcrypt.compare(password, user?.password)) {
            return null
        }
        return user
    }

    async createUser(email: string, password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
        const user = await this.prisma.user.create({
            data: { email, password: hashedPassword }
        })
        return user
    }

    async updateUserVerified(id: string, isVerified: boolean): Promise<User> {
        return await this.prisma.user.update({
            where: { id },
            data: { isVerified }
        })
    }

    async updateUserEmail(id: string, email: string): Promise<User> {
        return await this.prisma.user.update({
            where: { id },
            data: { email }
        })
    }

    async updateUserPassword(id: string, password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
        return await this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        })
    }
}
