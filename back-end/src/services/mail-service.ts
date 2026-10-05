import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { env } from '../env/index.js';

const LOGO_CID = 'tigela@marmita';
const LOGO_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../assets/tigela_logo_email.png',
);

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createTransport() {
  const port = Number(env.PORT_CORREIO);

  return nodemailer.createTransport({
    host: env.CORREIO,
    port,
    secure: port === 465,
    auth: {
      user: env.EMAIL_AUTOMACAO,
      pass: env.PASSWORD_AUTOMACAO,
    },
  });
}

function spacedCode(code: string): string {
  return code.split('').join(' ');
}

function buildBrandedCodeEmailHtml(params: {
  title: string;
  subtitle: string;
  name: string;
  bodyHtml: string;
  code: string;
}) {
  const safeName = escapeHtml(params.name);
  const safeCode = escapeHtml(spacedCode(params.code));

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(params.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#2f9d63 0%,#3bb87a 55%,#6fd3a0 100%);padding:28px 24px 22px;text-align:center;">
                <img
                  src="cid:${LOGO_CID}"
                  width="88"
                  height="88"
                  alt="Tigela"
                  style="display:block;margin:0 auto 12px;border:0;outline:none;width:88px;height:88px;object-fit:contain;"
                />
                <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;color:#ffffff;">
                  Marmita
                </div>
                <div style="margin-top:4px;font-size:13px;color:rgba(255,255,255,0.9);">
                  ${escapeHtml(params.subtitle)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;text-align:center;">
                <p style="margin:0 0 10px;font-size:16px;line-height:1.5;">
                  Olá, <strong>${safeName}</strong>.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                  ${params.bodyHtml}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 8px;" align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:320px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;">
                  <tr>
                    <td style="padding:20px 16px;text-align:center;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#15803d;margin-bottom:10px;">
                        Seu código
                      </div>
                      <div style="font-size:32px;font-weight:700;letter-spacing:10px;color:#166534;font-family:Consolas,'Courier New',monospace;">
                        ${safeCode}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 8px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#374151;">
                  O código expira em <strong>10 minutos</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  Se você não solicitou isso, ignore este e-mail.<br />
                  Este é um e-mail automático. Não responda.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

async function sendBrandedCodeEmail(params: {
  to: string;
  name: string;
  code: string;
  subject: string;
  subtitle: string;
  bodyText: string;
  bodyHtml: string;
}) {
  const transport = createTransport();

  await transport.sendMail({
    from: `"Marmita" <${env.EMAIL_AUTOMACAO}>`,
    to: params.to,
    subject: params.subject,
    text: [
      `Olá, ${params.name}.`,
      '',
      params.bodyText,
      `Seu código é: ${params.code}`,
      '',
      'Ele expira em 10 minutos.',
      'Se você não solicitou isso, ignore este e-mail.',
      '',
      'Este é um e-mail automático. Não responda.',
    ].join('\n'),
    html: buildBrandedCodeEmailHtml({
      title: params.subject,
      subtitle: params.subtitle,
      name: params.name,
      bodyHtml: params.bodyHtml,
      code: params.code,
    }),
    attachments: [
      {
        filename: 'tigela.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

type EmailCodeParams = {
  to: string;
  name: string;
  code: string;
};

export async function sendEmailChallengeCode({
  to,
  name,
  code,
}: EmailCodeParams) {
  await sendBrandedCodeEmail({
    to,
    name,
    code,
    subject: 'Código de verificação — Marmita',
    subtitle: 'Confirmação de acesso',
    bodyText:
      'Para continuar usando a Marmita, confirme que este acesso é seu.',
    bodyHtml:
      'Para continuar usando a Marmita, confirme que este acesso é seu com o código abaixo.',
  });
}

export async function sendPasswordResetLink({
  to,
  name,
  resetLink,
}: {
  to: string;
  name: string;
  resetLink: string;
}) {
  const transport = createTransport();
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(resetLink);

  await transport.sendMail({
    from: `"Marmita" <${env.EMAIL_AUTOMACAO}>`,
    to,
    subject: 'Redefinição de senha — Marmita',
    text: [
      `Olá, ${name}.`,
      '',
      'Recebemos um pedido para redefinir sua senha no Marmita.',
      'Abra o link abaixo para criar uma nova senha:',
      resetLink,
      '',
      'O link expira em 30 minutos.',
      'Se você não solicitou isso, ignore este e-mail.',
      '',
      'Este é um e-mail automático. Não responda.',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redefinição de senha — Marmita</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#2f9d63 0%,#3bb87a 55%,#6fd3a0 100%);padding:28px 24px 22px;text-align:center;">
                <img
                  src="cid:${LOGO_CID}"
                  width="88"
                  height="88"
                  alt="Tigela"
                  style="display:block;margin:0 auto 12px;border:0;outline:none;width:88px;height:88px;object-fit:contain;"
                />
                <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;color:#ffffff;">
                  Marmita
                </div>
                <div style="margin-top:4px;font-size:13px;color:rgba(255,255,255,0.9);">
                  Esqueci a senha
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;text-align:center;">
                <p style="margin:0 0 10px;font-size:16px;line-height:1.5;">
                  Olá, <strong>${safeName}</strong>.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                  Recebemos um pedido para redefinir sua senha no Marmita.
                  Clique no botão abaixo para criar uma nova senha.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 8px;" align="center">
                <a
                  href="${safeLink}"
                  style="display:inline-block;padding:14px 22px;background:#3bb87a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;"
                >
                  Redefinir senha
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 8px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  Se o botão não funcionar, copie e cole este link no navegador:<br />
                  <a href="${safeLink}" style="color:#15803d;word-break:break-all;">${safeLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 8px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#374151;">
                  O link expira em <strong>30 minutos</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  Se você não solicitou isso, ignore este e-mail.<br />
                  Este é um e-mail automático. Não responda.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `,
    attachments: [
      {
        filename: 'tigela.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}
