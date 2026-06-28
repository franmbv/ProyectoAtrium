const nodemailer = require('nodemailer');
const { renderHtmlToPdf } = require('html2pdfsmith');

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

// Generar PDF de factura con html2pdfsmith (sin Chromium)
// Patrón autocore-invoice: <style> en head, tablas planas, sin anidar
async function generarPdfFactura(facturaData, codigoFactura) {
  const fmt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fotoURL = (facturaData.foto && facturaData.foto.startsWith('http'))
    ? facturaData.foto
    : 'https://via.placeholder.com/400x300?text=Sin+imagen';
  const fecha = facturaData.fechaDeVenta
    ? new Date(facturaData.fechaDeVenta).toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
    }
    .container {
      padding: 10px 20px;
    }

    /* HEADER */
    .header {
      width: 100%;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header td {
      vertical-align: bottom;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      color: #f97316;
    }
    .brand span {
      color: #0f172a;
      font-weight: 400;
    }
    .invoice-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #6b7280;
      font-weight: 600;
      text-align: right;
    }
    .invoice-no {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      text-align: right;
      margin-top: 4px;
    }

    /* INFO TABLE */
    .info-table {
      width: 100%;
      margin-bottom: 28px;
      font-size: 11px;
      line-height: 1.5;
    }
    .info-table td {
      vertical-align: top;
    }
    .meta-label {
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .meta-value {
      font-weight: 500;
      color: #111827;
      margin-bottom: 12px;
    }

    /* SECCION LABEL */
    .section-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      font-weight: 600;
      text-align: left;
      padding-bottom: 10px;
      border-bottom: 1px solid #d1d5db;
    }

    /* OBRA TABLE */
    .obra-table {
      width: 100%;
      margin-top: 12px;
      margin-bottom: 28px;
      border-collapse: collapse;
    }
    .obra-table td {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12px;
      vertical-align: top;
    }
    .obra-name {
      font-weight: 600;
      color: #111827;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .obra-artist {
      color: #6b7280;
      font-size: 12px;
    }
    .obra-genre {
      color: #9ca3af;
      font-size: 11px;
    }

    /* PAGO TABLE */
    .pago-table {
      width: 45%;
      margin-left: auto;
      margin-top: 12px;
      margin-bottom: 28px;
      border-collapse: collapse;
    }
    .pago-table td {
      padding: 8px 0;
      font-size: 12px;
      color: #4b5563;
    }
    .pago-right {
      text-align: right;
    }
    .pago-total td {
      border-top: 2px solid #111827;
      padding-top: 12px;
      font-weight: 700;
      font-size: 16px;
      color: #111827;
    }

    /* COMPRADOR */
    .comprador-table {
      width: 100%;
      margin-top: 12px;
      margin-bottom: 28px;
      border-collapse: collapse;
    }
    .comprador-table td {
      padding: 6px 0;
      font-size: 12px;
      color: #4b5563;
      line-height: 1.6;
    }

    /* FOOTER */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- HEADER -->
    <table class="header">
      <tr>
        <td>
          <div class="brand">MUSEO <span>ATRIUM</span></div>
        </td>
        <td>
          <div class="invoice-title">Factura de Compra</div>
          <div class="invoice-no">${facturaData.codigoDeFactura || codigoFactura}</div>
        </td>
      </tr>
    </table>

    <!-- META: fecha y estado -->
    <table class="info-table">
      <tr>
        <td style="width: 50%;">
          <div class="meta-label">Fecha de Emision</div>
          <div class="meta-value">${fecha}</div>
        </td>
        <td style="width: 25%;">
          <div class="meta-label">Estado</div>
          <div class="meta-value">PAGADA</div>
        </td>
        <td style="width: 25%; text-align: right;">
          <div class="meta-label">Total Pagado</div>
          <div style="font-size: 22px; font-weight: 700; color: #111827;">$${fmt(facturaData.precioFinalVenta || 0)}</div>
        </td>
      </tr>
    </table>

    <!-- DETALLE OBRA -->
    <div class="section-label">Detalle de la Obra</div>
    <table class="obra-table">
      <colgroup>
        <col style="width: 120px;">
        <col>
      </colgroup>
      <tr>
        <td>
          <img src="${fotoURL}" width="110" height="80" style="border-radius: 4px; border: 0; display: block;" alt="${facturaData.nombre_obra || 'Obra'}">
        </td>
        <td style="padding-left: 16px;">
          <div class="obra-name">${facturaData.nombre_obra || 'N/A'}</div>
          <div class="obra-artist">por ${facturaData.nombre_artista || ''} ${facturaData.apellido_artista || ''}</div>
          <div class="obra-genre">${facturaData.nombre_genero || ''}</div>
        </td>
      </tr>
    </table>

    <!-- DESGLOSE PAGO -->
    <div class="section-label">Desglose de Pago</div>
    <table class="pago-table">
      <tr>
        <td>Precio Base</td>
        <td class="pago-right">$${fmt(facturaData.precioObra || 0)}</td>
      </tr>
      <tr>
        <td>IVA (16%)</td>
        <td class="pago-right">$${fmt(facturaData.iva || 0)}</td>
      </tr>
      <tr>
        <td>Comision Museo (${facturaData.gananciaMuseoPorcentaje || 0}%)</td>
        <td class="pago-right">$${fmt(facturaData.gananciaMuseoDolares || 0)}</td>
      </tr>
      <tr class="pago-total">
        <td>Total</td>
        <td class="pago-right">$${fmt(facturaData.precioFinalVenta || 0)}</td>
      </tr>
    </table>

    <!-- DATOS COMPRADOR -->
    <div class="section-label">Datos del Comprador</div>
    <table class="comprador-table">
      <tr>
        <td style="width: 50%; font-weight: 600; color: #111827;">${facturaData.nombre_comprador || ''} ${facturaData.apellido_comprador || ''}</td>
        <td style="width: 50%;">C.I. ${facturaData.cedula || 'N/A'}</td>
      </tr>
      <tr>
        <td>${facturaData.gmail || ''}</td>
        <td>${facturaData.calle || ''}, ${facturaData.municipio || ''}</td>
      </tr>
      <tr>
        <td></td>
        <td>${facturaData.ciudad || ''}, ${facturaData.estado || ''}, ${facturaData.pais || ''}</td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div class="footer">
      Este documento es tu comprobante oficial de compra del Museo Atrium.<br>
      2026 Proyecto Atrium - UNEG Ingenieria en Informatica
    </div>

  </div>
</body>
</html>`;

  const pdf = await renderHtmlToPdf({
    html,
    hideHeader: true,
    resourcePolicy: { allowHttp: true, allowFile: false, allowData: true }
  });
  return Buffer.from(pdf);
}

// Email factura profesional con HTML embebido + PDF adjunto
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

  // Generar PDF adjunto
  const codigo = facturaData.codigoDeFactura || codigoFactura;
  let pdfAttachment = null;
  try {
    const pdfBuffer = await generarPdfFactura(facturaData, codigo);
    pdfAttachment = {
      filename: `Factura-${codigo}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    };
  } catch (pdfErr) {
    console.error('[MAILER] Error generando PDF:', pdfErr.message);
  }

  const mailOptions = {
    from: `"Museo Atrium 🏛️" <${fromAddress}>`,
    to: email,
    subject: `✅ Factura de Compra - ${codigo}`,
    text: `Tu compra de "${facturaData.nombre_obra}" ha sido procesada. Pago total: $${fmt(facturaData.precioFinalVenta || 0)}. Factura: ${codigo}`,
    html: html,
    attachments: pdfAttachment ? [pdfAttachment] : []
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  return { info, previewUrl };
}

module.exports = { sendSecurityCode, sendReservaAceptada, generarPdfFactura };