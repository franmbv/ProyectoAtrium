const nodemailer = require('nodemailer');

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT) === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendSecurityCode(email, code) {
  if (!email || typeof email !== 'string' || !email.endsWith('@gmail.com')) {
    throw new Error('El correo debe ser una cuenta @gmail.com válida');
  }

  const transporter = await getTransporter();

  const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || `no-reply@${process.env.APP_DOMAIN || 'example.com'}`;

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Código de seguridad - Reserva',
    text: `Su nuevo código de seguridad es: ${code}`,
    html: `<p>Su nuevo código de seguridad es: <strong>${code}</strong></p><p>Si no solicitó este código, ignore este mensaje.</p>`,
  };

  const info = await transporter.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

async function sendReservaAceptada(email, obraNombre, codigoFactura) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Correo invalido para notificacion de reserva');
  }

  const transporter = await getTransporter();

  const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || `no-reply@${process.env.APP_DOMAIN || 'example.com'}`;

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Reserva aceptada - Museo Atrium',
    text: `Tu reserva de "${obraNombre}" fue aceptada. Codigo de factura: ${codigoFactura}.`,
    html: `<p>Tu reserva de <strong>${obraNombre}</strong> fue aceptada.</p><p>Codigo de factura: <strong>${codigoFactura}</strong></p>`,
  };

  const info = await transporter.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

module.exports = { sendSecurityCode, sendReservaAceptada };
