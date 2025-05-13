import passport from '../config/passport'

export function requireAuth() {
    return passport.authenticate('jwt', { session: false, failWithError: true })
}