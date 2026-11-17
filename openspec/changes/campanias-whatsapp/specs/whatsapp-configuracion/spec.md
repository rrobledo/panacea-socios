## ADDED Requirements

### Requirement: Guardar la configuración de integración con Meta
`PUT /whatsapp/configuracion` SHALL guardar una única configuración (una sola fila) con estos datos:
- versión de Graph API (por defecto `v21.0`);
- `access_token` permanente del usuario del sistema;
- `app_secret`;
- `phone_number_id`;
- `waba_id` (WhatsApp Business Account ID);
- `app_id`;
- `webhook_verify_token`;
- idioma por defecto de las plantillas (por defecto `es_AR`);
- prefijo de país para normalizar teléfonos (por defecto `549`);
- número de prueba;
- tamaño de lote de envío (por defecto 50, máximo 500);
- pausa entre lotes en segundos;
- palabras de baja (por defecto `BAJA, STOP`);
- códigos de error que invalidan el número (por defecto `131026`);
- tarifas opcionales por categoría (`marketing`, `utility`, `service`) y su moneda, para estimar costos;
- interruptor `activo`.

Solo los administradores (`require_admin`) MUST poder leer o modificar la configuración. `access_token`, `app_secret` y `webhook_verify_token` MUST guardarse cifrados en la base. Un campo secreto que llega vacío o ausente MUST conservar el valor guardado.

#### Scenario: Alta de configuración
- **WHEN** un admin envía todos los parámetros por primera vez
- **THEN** responde 200 y la configuración queda guardada con los secretos cifrados

#### Scenario: Actualizar sin reenviar el token
- **WHEN** un admin cambia solo el tamaño de lote y deja `access_token` vacío
- **THEN** el token guardado no cambia

#### Scenario: Usuario no admin
- **WHEN** un usuario autenticado que no es admin llama a `PUT` o `GET /whatsapp/configuracion`
- **THEN** responde 403

### Requirement: Leer la configuración sin exponer secretos
`GET /whatsapp/configuracion` SHALL devolver la configuración con los secretos enmascarados: solo indica si están cargados y muestra sus últimos 4 caracteres. También MUST devolver la URL del webhook que hay que cargar en Meta (`{BASE_URL}/whatsapp/webhook`).

#### Scenario: Token enmascarado
- **WHEN** un admin consulta la configuración con un token cargado
- **THEN** la respuesta incluye `access_token_cargado: true` y `access_token_final: "…a1b2"`, nunca el token completo

#### Scenario: Sin configuración
- **WHEN** todavía no se guardó ninguna configuración
- **THEN** responde 200 con los valores por defecto, `configurado: false` y la URL del webhook

### Requirement: Probar la conexión con Meta
`POST /whatsapp/configuracion/probar` SHALL consultar la Graph API con la configuración guardada (datos del número de teléfono y de la WABA) y devolver si la conexión es válida, el número visible, el nombre verificado y el *quality rating*. Si falla, MUST devolver el código y el mensaje de error de Meta.

#### Scenario: Conexión correcta
- **WHEN** el token y el `phone_number_id` son válidos
- **THEN** responde `{ok: true, display_phone_number, verified_name, quality_rating}`

#### Scenario: Token vencido
- **WHEN** Meta responde error 190 (token inválido)
- **THEN** responde `{ok: false, codigo: 190, mensaje: "..."}`

### Requirement: Enviar un mensaje de prueba
`POST /whatsapp/configuracion/mensaje-prueba` SHALL enviar una plantilla elegida (por defecto `hello_world`, idioma `en_US`) al número de prueba o a un número indicado, y devolver el `wamid` del mensaje. Ese mensaje MUST quedar registrado en el historial como envío de prueba.

#### Scenario: Prueba exitosa
- **WHEN** un admin envía la prueba a su número
- **THEN** responde con el `wamid` y el mensaje aparece en el historial con estado `ENVIADO`

### Requirement: Integración desactivada
Si no hay configuración, o si `activo` es falso, todo envío (campañas, mensajes masivos, job de lotes) MUST rechazarse con 409 y `codigo: "WHATSAPP_NO_CONFIGURADO"`. El webhook MUST seguir aceptando estados para no perder actualizaciones de mensajes ya enviados.

#### Scenario: Intentar enviar con la integración inactiva
- **WHEN** se intenta iniciar una campaña con `activo = false`
- **THEN** responde 409 `WHATSAPP_NO_CONFIGURADO` y la campaña sigue en `BORRADOR`
