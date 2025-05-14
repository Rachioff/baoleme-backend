import nodemailer from 'nodemailer'

// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     secure: Boolean(process.env.SMTP_SECURE),
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASSWORD
//     },
// })

const transporter = {
    sendMail(o: any) {
        console.log(o)
    }
}

export async function sendVerifyRegisterEmail(email: string, token: string) {
    let url = `${process.env.BASE_URL}/email-postprocess/verify-register?token=${token}`
    await transporter.sendMail({
        from: `${process.env.APP_NAME} ${process.env.SMTP_USER}`,
        to: email,
        subject: '验证邮箱',
        html: `<a href="${url}">${url}</a>`
    })
}

export async function sendVerifyEmailEmail(email: string, token: string) {
    let url = `${process.env.BASE_URL}/email-postprocess/verify-email?token=${token}`
    await transporter.sendMail({
        from: `${process.env.APP_NAME} ${process.env.SMTP_USER}`,
        to: email,
        subject: '验证邮箱',
        html: `<a href="${url}">${url}</a>`
    })
}

export async function sendResetPasswordEmail(email: string, token: string) {
    let url = `${process.env.BASE_URL}/email-postprocess/reset-password?token=${token}`
    await transporter.sendMail({
        from: `${process.env.APP_NAME} ${process.env.SMTP_USER}`,
        to: email,
        subject: '重设密码',
        html: `<a href="${url}">${url}</a>`
    })
}
