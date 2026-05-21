/**
 * Cognito PreSignUp trigger — has-admin.
 *
 * Se invoca ANTES de crear el usuario en el pool. Su única función es cerrar
 * el hueco de escalada de privilegios del signup público (S6.3):
 *
 *   El atributo `custom:role` es escribible por el client SPA para que el
 *   formulario de signup permita elegir entre `citizen | donor | collaborator`.
 *   Sin este trigger, un atacante puede modificar la request y auto-asignarse
 *   `super_admin`.
 *
 * Regla:
 *   - `PreSignUp_SignUp` (alta self-service): si `custom:role` está presente y
 *     NO pertenece a la whitelist → se rechaza el signup lanzando un error.
 *   - `PreSignUp_AdminCreateUser`: exento. Crear un `super_admin` vía
 *     AdminCreateUser (CLI / consola) es la ÚNICA vía legítima.
 *   - `PreSignUp_ExternalProvider`: exento (no aplica `custom:role` del cliente).
 *
 * No requiere acceso a BD ni a secrets — sólo permisos básicos de ejecución.
 */

// Roles que un usuario puede auto-asignarse en el signup público.
// `super_admin` queda deliberadamente fuera.
const SELF_SIGNUP_ALLOWED_ROLES = new Set(["citizen", "donor", "collaborator"]);

export const handler = async (event) => {
  if (event.triggerSource === "PreSignUp_SignUp") {
    const attrs = event.request?.userAttributes ?? {};
    const role = attrs["custom:role"];

    // Rol ausente → el PostConfirmation aplicará el default `citizen`. OK.
    if (role && !SELF_SIGNUP_ALLOWED_ROLES.has(role)) {
      console.warn(
        `PreSignUp RECHAZADO: rol no permitido "${role}" ` +
          `email=${attrs.email ?? "?"} userPoolId=${event.userPoolId}`,
      );
      // Lanzar un error aborta el signup. Cognito lo expone al cliente.
      throw new Error("El rol seleccionado no es válido.");
    }
  }

  // Cualquier otro triggerSource (admin-create, federación) pasa sin tocar.
  return event;
};
