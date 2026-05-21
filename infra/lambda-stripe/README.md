# lambda-stripe

Código de la AWS Lambda que crea sesiones de Stripe Checkout para donaciones HAS.

Provisionada y desplegada vía Terraform en `../lambda-stripe.tf`.

## Estructura

```
lambda-stripe/
├── index.mjs        # Handler (ES module, Node 20)
├── package.json     # Solo dep: stripe SDK
├── README.md        # Este archivo
└── .gitignore       # ignora node_modules, *.zip
```

## Empaquetado

El archivo `package.json` declara `"type": "module"` y solo la dependencia `stripe`. Terraform
empaqueta así:

```bash
cd has-web/infra/lambda-stripe
npm install --omit=dev
zip -r ../lambda-stripe.zip index.mjs package.json node_modules
```

El recurso `aws_lambda_function.stripe_checkout` consume ese zip vía `filename` o `source_code_hash`.

## Variables de entorno

| Variable            | Origen                                                                                          | Notas                                |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| `STRIPE_SECRET_KEY` | Inyectada via `aws lambda update-function-configuration` por el operador. **Nunca commiteada.** | Empieza con `sk_test_` o `sk_live_`. |
| `SITE_ORIGIN`       | Variable Terraform                                                                              | `https://haslife.org` por defecto.   |

## Inyectar la key de Stripe (operación humana)

Desde la terminal del operador (perfil `dixi`):

```bash
aws lambda update-function-configuration \
  --profile dixi \
  --region us-east-1 \
  --function-name has-stripe-checkout \
  --environment "Variables={STRIPE_SECRET_KEY=sk_test_xxx,SITE_ORIGIN=https://haslife.org}"
```

Reemplazar `sk_test_xxx` por la key real. La key **nunca** se pasa por chat.

## Pruebas locales

Stripe ofrece tarjetas de prueba — la principal es `4242 4242 4242 4242` con cualquier CVC/fecha futura.

Curl directo a la Function URL (después de desplegar):

```bash
FUNCTION_URL=$(cd has-web/infra && terraform output -raw lambda_function_url)
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"amount":5,"currency":"usd","recurring":"once","locale":"es"}'
```

Debe devolver `{"url":"https://checkout.stripe.com/c/pay/cs_test_..."}`.
