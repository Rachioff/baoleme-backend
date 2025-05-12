import passport from 'passport'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET 未在环境变量中定义！');
  }
  
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET // 移除非空断言
  };


passport.use(new JWTStrategy(jwtOptions, async (payload, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: payload.sub, password: payload.pwd }
        });
        return user ? done(null, user) : done(new Error());
    } catch (error) {
        return done(error);
    }

}))

export default passport