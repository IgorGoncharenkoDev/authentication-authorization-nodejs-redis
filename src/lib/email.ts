import nodemailer from 'nodemailer'

import { chalkError } from '@/config/chalk'

export async function sendEmail(to: string, subject: string, html: string) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.error(chalkError('SMTP credentials not found!'))
    return
  }

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT || '587'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: false,
    auth: {
      user,
      pass,
    },
  })

  await transporter.sendMail({ from, to, subject, html })
}
