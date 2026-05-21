###############################################################################
# Cognito user pool — has-admin (admin.haslife.org)
#
# Decisiones documentadas en:
#   - 09-architecture/adr/ADR-017-cognito-custom-ui-amplify.md
#   - 04-modules/admin-platform/module-spec.md
#
# Email actualmente entregado por Cognito default (SES sigue en sandbox).
# Cuando SES production access esté aprobado, cambiar a:
#   email_configuration { email_sending_account = "DEVELOPER" source_arn = aws_ses_email_identity.noreply.arn }
###############################################################################

resource "aws_cognito_user_pool" "platform" {
  name = "haslife-platform-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 120
    }
  }

  # Custom attribute: role (citizen | donor | collaborator | super_admin)
  # Mutable para que super_admin pueda cambiarlo desde la app.
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 4
      max_length = 32
    }
  }

  # locale: aunque lo declaramos aquí, Cognito lo trata como atributo estándar OIDC
  # y lo expone SIN prefijo `custom:`. Referenciarlo como `locale` en read/write_attributes.
  schema {
    name                     = "locale"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 2
      max_length = 5
    }
  }

  # MFA opt-in. Enforcement de super_admin obligatorio se hace en backend (no en Cognito).
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # NOTA: con el trigger `custom_message` activo (S6.6), el cuerpo y asunto de
  # los correos los genera la Lambda `has-cognito-custom-message` por idioma.
  # Este template y el `invite_message_template` quedan como fallback si el
  # trigger se retirara. `default_email_option` sigue siendo relevante.
  verification_message_template {
    default_email_option  = "CONFIRM_WITH_CODE"
    email_subject         = "HAS + LIFE — Verifica tu cuenta / Verify your account"
    email_message         = <<-HTML
      <!DOCTYPE html>
      <html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
          <tr><td align="center">
            <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
              <tr><td style="background:linear-gradient(135deg,#0f3057 0%,#1e4976 100%);padding:36px 32px;text-align:center;">
                <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.5px;line-height:1;">HAS <span style="color:#f0a500;">+ LIFE</span></div>
                <div style="color:#cbd5e1;font-size:12px;margin-top:8px;letter-spacing:1.5px;text-transform:uppercase;">Human Aging Simulators</div>
              </td></tr>
              <tr><td style="padding:40px 32px 24px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;font-weight:600;">Verifica tu cuenta · Verify your account</h1>
                <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.6;">
                  Bienvenida/o a HAS. Usa este código para confirmar tu correo.<br>
                  <span style="color:#94a3b8;">Welcome to HAS. Use this code to confirm your email.</span>
                </p>
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px;">
                  <div style="font-family:'SF Mono','Monaco','Courier New',monospace;font-size:36px;font-weight:700;color:#0c4a6e;letter-spacing:12px;line-height:1;">{####}</div>
                </div>
                <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                  Ingrésalo en la pantalla de verificación para activar tu cuenta.<br>
                  <span style="color:#94a3b8;">Enter it on the verification screen to activate your account.</span>
                </p>
                <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  Si no creaste una cuenta en HAS, ignora este correo. · If you didn't create an account at HAS, ignore this email.
                </p>
              </td></tr>
              <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
                Human Aging Simulators · <a href="https://haslife.org" style="color:#64748b;text-decoration:none;">haslife.org</a><br>
                Investigación abierta sobre envejecimiento humano · Open science on human aging
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>
    HTML
    email_subject_by_link = "HAS + LIFE — Verifica tu cuenta"
    email_message_by_link = "Bienvenida/o a HAS. Verifica tu cuenta haciendo click: {##Verificar##}"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "HAS — Acceso a la plataforma"
      email_message = "Tu cuenta HAS está lista. Email: {username}. Contraseña temporal: {####}"
      sms_message   = "HAS: {username} / {####}"
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = true
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  lambda_config {
    pre_sign_up       = aws_lambda_function.cognito_pre_signup.arn
    post_confirmation = aws_lambda_function.cognito_post_confirm.arn
    custom_message    = aws_lambda_function.cognito_custom_message.arn
  }

  deletion_protection = "ACTIVE"

  tags = {
    Component = "has-admin"
    Module    = "auth"
  }
}

# App client público para la SPA (Next.js). Sin client secret — auth corre en browser via Amplify.
resource "aws_cognito_user_pool_client" "platform_spa" {
  name         = "has-admin-spa"
  user_pool_id = aws_cognito_user_pool.platform.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  read_attributes = [
    "email",
    "email_verified",
    "name",
    "locale",
    "custom:role"
  ]

  write_attributes = [
    "email",
    "name",
    "locale",
    "custom:role"
    # SECURITY: custom:role es writable por el client SPA para que el signup form
    # permita al user elegir entre citizen|donor|collaborator. La escalada a
    # 'super_admin' vía request manipulada queda bloqueada por el PreSignUp
    # Lambda trigger (aws_lambda_function.cognito_pre_signup, tarea S6.3):
    # rechaza todo signup self-service con un rol fuera de la whitelist.
    # El alta de super_admin sólo es posible vía AdminCreateUser (CLI/consola).
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = [
    "https://admin.${local.domain}/auth/callback",
    "http://localhost:3000/auth/callback"
  ]

  logout_urls = [
    "https://admin.${local.domain}/",
    "http://localhost:3000/"
  ]
}

# Domain Cognito (necesario para hosted UI fallback y refresh token endpoints)
resource "aws_cognito_user_pool_domain" "platform" {
  domain       = "haslife-auth"
  user_pool_id = aws_cognito_user_pool.platform.id
}
