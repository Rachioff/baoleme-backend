import jwt from 'jsonwebtoken';

declare module 'jsonwebtoken' {
    export interface JwtPayload {
        sub?: string;
        pwd?: string;
        verify?: boolean;
        email?: string;
        resetPassword?: boolean;
    }
} 