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

// Email factura profesional con HTML embebido
async function sendReservaAceptada(email, facturaData, codigoFactura) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Correo invalido para notificacion de reserva');
  }

  const transporter = await getTransporter();
  const fromAddress = process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@atrium.com';

  const fmt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fotoURL = (facturaData.foto && facturaData.foto.startsWith('http'))
    ? facturaData.foto
    : 'https://via.placeholder.com/400x300?text=Sin+imagen';

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- HEADER -->
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:30px 40px;text-align:center;">
                <h1 style="margin:0;color:#f97316;font-size:28px;letter-spacing:2px;">🏛️ MUSEO ATRIUM</h1>
                <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Factura de Compra</p>
              </td>
            </tr>

            <!-- CÓDIGO Y FECHA -->
            <tr>
              <td style="padding:25px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px 20px;">
                      <span style="font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">✅ Reserva Aceptada</span><br>
                      <span style="font-size:13px;color:#334155;">Tu compra ha sido procesada exitosamente.</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- DETALLES FACTURA -->
            <tr>
              <td style="padding:25px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  <tr style="background:#f8fafc;">
                    <td style="padding:12px 20px;font-size:12px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0;">Código de Factura</td>
                    <td style="padding:12px 20px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${facturaData.codigoDeFactura || codigoFactura}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 20px;font-size:12px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0;">Fecha de Emisión</td>
                    <td style="padding:12px 20px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${facturaData.fechaDeVenta ? new Date(facturaData.fechaDeVenta).toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' }) : 'N/A'}</td>
                  </tr>
                  <tr style="background:#f8fafc;">
                    <td style="padding:12px 20px;font-size:12px;color:#64748b;font-weight:700;">Estado</td>
                    <td style="padding:12px 20px;"><span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">PAGADA</span></td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- OBRA -->
            <tr>
              <td style="padding:25px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                      <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Detalle de la Obra</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="140" valign="top">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${fotoURL}" style="width:130px;height:100px;" stroke="f">
                              <v:fill type="frame" src="${fotoURL}"/>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <a href="${fotoURL}" target="_blank" style="display:block;text-decoration:none;">
                              <img src="${fotoURL}" width="130" height="100" style="border-radius:6px;display:block;border:0;outline:none;text-decoration:none;width:130px;height:100px;" alt="${facturaData.nombre_obra || 'Obra'}" title="${facturaData.nombre_obra || 'Obra'}">
                            </a>
                            <!--<![endif]-->
                          </td>
                          <td style="padding-left:15px;" valign="top">
                            <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a;">${facturaData.nombre_obra || 'N/A'}</p>
                            <p style="margin:0 0 4px;font-size:13px;color:#64748b;">por <strong>${facturaData.nombre_artista || ''} ${facturaData.apellido_artista || ''}</strong></p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">${facturaData.nombre_genero || ''}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- DESGLOSE PRECIO -->
            <tr>
              <td style="padding:25px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                      <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Desglose de Pago</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:8px 0;font-size:13px;color:#475569;">Precio Base</td>
                          <td style="padding:8px 0;font-size:13px;color:#0f172a;text-align:right;">$${fmt(facturaData.precioObra || 0)}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:13px;color:#475569;">IVA (16%)</td>
                          <td style="padding:8px 0;font-size:13px;color:#0f172a;text-align:right;">$${fmt(facturaData.iva || 0)}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:13px;color:#475569;">Comisión Museo (${facturaData.gananciaMuseoPorcentaje || 0}%)</td>
                          <td style="padding:8px 0;font-size:13px;color:#0f172a;text-align:right;">$${fmt(facturaData.gananciaMuseoDolares || 0)}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding:8px 0;border-top:2px solid #e2e8f0;"></td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:16px;font-weight:800;color:#0f172a;">PAGO TOTAL</td>
                          <td style="padding:8px 0;font-size:20px;font-weight:800;color:#f97316;text-align:right;">$${fmt(facturaData.precioFinalVenta || 0)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- COMPRADOR Y ENVÍO -->
            <tr>
              <td style="padding:25px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                      <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Datos del Comprador</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px 20px;font-size:13px;color:#334155;line-height:1.8;">
                      <strong>${facturaData.nombre_comprador || ''} ${facturaData.apellido_comprador || ''}</strong><br>
                      C.I. ${facturaData.cedula || 'N/A'}<br>
                      ${facturaData.gmail || email}<br>
                      <span style="color:#64748b;font-size:12px;">
                        📍 ${facturaData.calle || ''}, ${facturaData.municipio || ''}, ${facturaData.ciudad || ''}, ${facturaData.estado || ''}, ${facturaData.pais || ''}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding:30px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                      <p style="margin:0;font-size:11px;color:#94a3b8;">Este correo es tu comprobante oficial de compra del Museo Atrium.</p>
                      <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">© 2026 Proyecto Atrium — UNEG Ingeniería en Informática</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </div>
  `;

  const mailOptions = {
    from: `"Museo Atrium 🏛️" <${fromAddress}>`,
    to: email,
    subject: `✅ Factura de Compra - ${facturaData.codigoDeFactura || codigoFactura}`,
    text: `Tu compra de "${facturaData.nombre_obra}" ha sido procesada. Pago total: $${fmt(facturaData.precioFinalVenta || 0)}. Factura: ${facturaData.codigoDeFactura || codigoFactura}`,
    html: html
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

module.exports = { sendSecurityCode, sendReservaAceptada };