const nodemailer = require('nodemailer');

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
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

  const fromAddress = process.env.SMTP_USER || process.env.GMAIL_USER || `no-reply@atrium.com`;

  const mailOptions = {
    from: `"Museo Atrium 🏛️" <${fromAddress}>`,
    to: email,
    subject: '🔐 Código de seguridad - Proyecto Atrium',
    text: `Su nuevo código de seguridad es: ${code}`,
    html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #f97316;">¡Bienvenido al Museo Atrium!</h2>
            <p>Has completado tu registro exitosamente. Para confirmar tus reservas, utiliza el siguiente código:</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">Si no solicitó este código, ignore este mensaje.</p>
        </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

// MODIFICADO: Recibe pdfBuffer y lo adjunta
async function sendReservaAceptada(email, obraNombre, codigoFactura, pdfBuffer) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Correo invalido para notificacion de reserva');
  }

  const transporter = await getTransporter();

  const fromAddress = process.env.SMTP_USER || process.env.GMAIL_USER || `no-reply@atrium.com`;

  const mailOptions = {
    from: `"Museo Atrium 🏛️" <${fromAddress}>`,
    to: email,
    subject: `✅ Factura de Compra - ${codigoFactura}`,
    text: `Tu reserva de "${obraNombre}" fue aceptada. Adjuntamos tu factura legal.`,
    html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px; max-width: 600px; margin: auto;">
            <h2 style="color: #10b981;">Reserva Aceptada</h2>
            <p>Tu reserva de la obra <strong>${obraNombre}</strong> ha sido procesada con éxito.</p>
            <p>Adjunto a este correo encontrarás tu <strong>factura legal</strong> en formato PDF.</p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">Gracias por confiar en el Museo Atrium.</p>
        </div>
    `,
    attachments: [
        {
            filename: `Factura_${codigoFactura}.pdf`,
            content: pdfBuffer
        }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

module.exports = { sendSecurityCode, sendReservaAceptada };