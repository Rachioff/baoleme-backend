import passport from 'passport'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { PrismaClient } from '@prisma/client'
import * as AuthService from '../service/auth.service'

const prisma = new PrismaClient()

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!
}

passport.use(new JWTStrategy(jwtOptions, async (payload, done) => {
    try {
        const user = await AuthService.getUserById(payload.sub, payload.pwd)
        return user ? done(null, user) : done(new Error())
    } catch (error) {
        return done(error)
    }

}))

export default passport