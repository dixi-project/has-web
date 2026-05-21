/**
 * Cognito CustomMessage trigger — has-admin (S6.6).
 *
 * Genera el asunto y el cuerpo HTML de los correos transaccionales de Cognito
 * en el idioma del usuario (`locale`), reemplazando los templates únicos del
 * pool por templates dedicados por idioma.
 *
 * Idiomas: `es` (fuente) y `en`. Cualquier otro locale cae a `es`.
 *
 * triggerSources manejados:
 *   - CustomMessage_SignUp / CustomMessage_ResendCode → verificación de email
 *   - CustomMessage_ForgotPassword                    → restablecer contraseña
 *   - CustomMessage_AdminCreateUser                   → invitación (alta admin)
 *   - CustomMessage_VerifyUserAttribute / _UpdateUserAttribute → verificar dato
 *   - cualquier otro con código                       → mensaje genérico
 *
 * Cognito sustituye los placeholders DESPUÉS del Lambda:
 *   `event.request.codeParameter`     → el código (`{####}`)
 *   `event.request.usernameParameter` → el username (`{username}`)
 * El cuerpo devuelto DEBE contener esos placeholders cuando aplican, o Cognito
 * rechaza la respuesta.
 *
 * No requiere acceso a BD ni secrets — solo permisos básicos de ejecución.
 */

const SUPPORTED = new Set(["es", "en"]);
const DEFAULT_LOCALE = "es";

function normalizeLocale(raw) {
  const l = String(raw ?? "")
    .slice(0, 2)
    .toLowerCase();
  return SUPPORTED.has(l) ? l : DEFAULT_LOCALE;
}

// Textos por idioma × tipo de mensaje.
const STRINGS = {
  es: {
    verify: {
      subject: "HAS + LIFE — Verifica tu cuenta",
      heading: "Verifica tu cuenta",
      intro:
        "Bienvenida/o a HAS. Usa este código para confirmar tu correo electrónico.",
      hint: "Ingresa el código en la pantalla de verificación para activar tu cuenta.",
      note: "Si no creaste una cuenta en HAS, ignora este correo.",
    },
    reset: {
      subject: "HAS + LIFE — Restablece tu contraseña",
      heading: "Restablece tu contraseña",
      intro:
        "Recibimos una solicitud para restablecer tu contraseña. Usa este código para continuar.",
      hint: "Ingresa el código en la pantalla de recuperación. Caduca en 1 hora.",
      note: "Si no solicitaste este cambio, ignora este correo: tu contraseña sigue igual.",
    },
    invite: {
      subject: "HAS + LIFE — Acceso a la plataforma",
      heading: "Tu cuenta está lista",
      intro:
        "Se creó una cuenta para ti en la plataforma HAS. Inicia sesión con estos datos:",
      hint: "Por seguridad, cambia tu contraseña temporal al iniciar sesión.",
      note: "Si no esperabas este acceso, contacta al equipo de HAS.",
      accountLabel: "Correo electrónico",
      codeLabel: "Contraseña temporal",
    },
    verifyAttr: {
      subject: "HAS + LIFE — Verifica tu información",
      heading: "Verifica tu información",
      intro: "Usa este código para confirmar el cambio en tu cuenta de HAS.",
      hint: "Ingresa el código en la pantalla de verificación.",
      note: "Si no solicitaste este cambio, ignora este correo.",
    },
    generic: {
      subject: "HAS + LIFE — Código de verificación",
      heading: "Código de verificación",
      intro: "Usa este código para continuar en la plataforma HAS.",
      hint: "Ingresa el código en la pantalla correspondiente.",
      note: "Si no reconoces esta solicitud, ignora este correo.",
    },
    codeBlockLabel: "Tu código",
    footerLine1: "Human Aging Simulators",
    footerLine2: "Investigación abierta sobre envejecimiento humano",
    sms: "HAS: tu código es {####}",
  },
  en: {
    verify: {
      subject: "HAS + LIFE — Verify your account",
      heading: "Verify your account",
      intro: "Welcome to HAS. Use this code to confirm your email address.",
      hint: "Enter the code on the verification screen to activate your account.",
      note: "If you didn't create an account at HAS, ignore this email.",
    },
    reset: {
      subject: "HAS + LIFE — Reset your password",
      heading: "Reset your password",
      intro:
        "We received a request to reset your password. Use this code to continue.",
      hint: "Enter the code on the recovery screen. It expires in 1 hour.",
      note: "If you didn't request this, ignore this email: your password is unchanged.",
    },
    invite: {
      subject: "HAS + LIFE — Platform access",
      heading: "Your account is ready",
      intro:
        "An account has been created for you on the HAS platform. Sign in with these details:",
      hint: "For security, change your temporary password when you sign in.",
      note: "If you weren't expecting this access, contact the HAS team.",
      accountLabel: "Email address",
      codeLabel: "Temporary password",
    },
    verifyAttr: {
      subject: "HAS + LIFE — Verify your information",
      heading: "Verify your information",
      intro: "Use this code to confirm the change to your HAS account.",
      hint: "Enter the code on the verification screen.",
      note: "If you didn't request this change, ignore this email.",
    },
    generic: {
      subject: "HAS + LIFE — Verification code",
      heading: "Verification code",
      intro: "Use this code to continue on the HAS platform.",
      hint: "Enter the code on the matching screen.",
      note: "If you don't recognize this request, ignore this email.",
    },
    codeBlockLabel: "Your code",
    footerLine1: "Human Aging Simulators",
    footerLine2: "Open science on human aging",
    sms: "HAS: your code is {####}",
  },
};

/** Renderiza el correo HTML branded HAS + LIFE. */
function renderEmail({
  heading,
  intro,
  accountRow,
  codeLabel,
  code,
  hint,
  note,
  footer1,
  footer2,
}) {
  const accountBlock = accountRow
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
         <tr><td style="font-size:13px;color:#64748b;padding:0 0 4px;">${accountRow.label}</td></tr>
         <tr><td style="font-size:15px;color:#0f172a;font-weight:600;font-family:'SF Mono','Monaco','Courier New',monospace;">${accountRow.value}</td></tr>
       </table>`
    : "";
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <tr><td style="background:linear-gradient(135deg,#0f3057 0%,#1e4976 100%);padding:36px 32px;text-align:center;">
          <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.5px;line-height:1;">HAS <span style="color:#f0a500;">+ LIFE</span></div>
          <div style="color:#cbd5e1;font-size:12px;margin-top:8px;letter-spacing:1.5px;text-transform:uppercase;">Human Aging Simulators</div>
        </td></tr>
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;font-weight:600;">${heading}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">${intro}</p>
          ${accountBlock}
          <div style="font-size:12px;color:#64748b;margin:0 0 6px;">${codeLabel}</div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
            <div style="font-family:'SF Mono','Monaco','Courier New',monospace;font-size:32px;font-weight:700;color:#0c4a6e;letter-spacing:8px;line-height:1;">${code}</div>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">${hint}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">${note}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
          ${footer1} · <a href="https://haslife.org" style="color:#64748b;text-decoration:none;">haslife.org</a><br>${footer2}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function kindFromTriggerSource(src) {
  switch (src) {
    case "CustomMessage_SignUp":
    case "CustomMessage_ResendCode":
      return "verify";
    case "CustomMessage_ForgotPassword":
      return "reset";
    case "CustomMessage_AdminCreateUser":
      return "invite";
    case "CustomMessage_VerifyUserAttribute":
    case "CustomMessage_UpdateUserAttribute":
      return "verifyAttr";
    default:
      return "generic";
  }
}

export const handler = async (event) => {
  const attrs = event.request?.userAttributes ?? {};
  const locale = normalizeLocale(attrs.locale);
  const L = STRINGS[locale];
  const kind = kindFromTriggerSource(event.triggerSource);
  const s = L[kind];

  const code = event.request?.codeParameter ?? "{####}";
  const username = event.request?.usernameParameter ?? "{username}";

  const html = renderEmail({
    heading: s.heading,
    intro: s.intro,
    accountRow:
      kind === "invite" ? { label: s.accountLabel, value: username } : null,
    codeLabel: kind === "invite" ? s.codeLabel : L.codeBlockLabel,
    code,
    hint: s.hint,
    note: s.note,
    footer1: L.footerLine1,
    footer2: L.footerLine2,
  });

  event.response.emailSubject = s.subject;
  event.response.emailMessage = html;
  event.response.smsMessage = L.sms;

  console.log(
    `CustomMessage: trigger=${event.triggerSource} kind=${kind} locale=${locale}`,
  );
  return event;
};
