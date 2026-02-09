import { toFile } from 'qrcode'

import { chalkSuccess } from '../src/config/chalk'

const otpAuthUrl = process.argv[2]

if (!otpAuthUrl) {
  throw new Error('OTP Auth URL is required!')
}

async function generateQRCode() {
  await toFile('qrcode.png', otpAuthUrl)
  console.log(chalkSuccess('QR code generated and saved successfully!'))
}

generateQRCode().catch((err) => {
  console.error(err)
  process.exit(1)
})
