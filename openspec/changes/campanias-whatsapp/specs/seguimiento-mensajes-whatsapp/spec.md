## ADDED Requirements

### Requirement: Verificación del webhook
`GET /whatsapp/webhook` SHALL responder el valor de `hub.challenge` en texto plano con 200 cuando `hub.mode = subscribe` y `hub.verify_token` coincide con el token configurado. En cualquier otro caso MUST responder 403. El endpoint es público (sin JWT).

#### Scenario: Verificación correcta
- **WHEN** Meta llama con `hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123`
- **THEN** responde `123` con 200

#### Scenario: Token incorrecto
- **WHEN** `hub.verify_token` no coincide
- **THEN** responde 403

### Requirement: Autenticidad de las notificaciones
`POST /whatsapp/webhook` SHALL validar la firma `X-Hub-Signature-256`: un HMAC-SHA256 del cuerpo crudo con el `app_secret` configurado, comparado en tiempo constante. Una firma ausente o inválida MUST responderse con 401, sin procesar el cuerpo. Una notificación válida MUST responderse con 200 aunque no se encuentre el mensaje al que se refiere, para que Meta no la reintente sin fin.

#### Scenario: Firma inválida
- **WHEN** llega un POST con una firma que no coincide
- **THEN** responde 401 y no se modifica ningún mensaje

### Requirement: Registro de eventos crudos
Cada notificación válida SHALL guardarse en `whatsapp_eventos` con su tipo (`status`, `message`, `template_status`, otro), el `wamid` si tiene, el payload completo y la fecha de recepción, para auditoría y reproceso.

#### Scenario: Evento guardado
- **WHEN** llega un estado `delivered`
- **THEN** existe un registro en `whatsapp_eventos` con tipo `status` y su `wamid`

### Requirement: Actualizar el estado de cada mensaje
Los estados `sent`, `delivered`, `read` y `failed` del webhook SHALL actualizar el mensaje con ese `wamid`, guardando la fecha de cada hito (`enviado_en`, `entregado_en`, `leido_en`, `fallido_en`). El estado MUST avanzar solo hacia adelante (`ENVIADO` < `ENTREGADO` < `LEIDO`): un `delivered` que llega después de un `read` registra la fecha de entrega pero no retrocede el estado. Un `read` sin `delivered` previo MUST registrar también la entrega. En `failed` se MUST guardar `error_codigo`, `error_titulo` y `error_detalle`. Si el payload trae `pricing`, MUST guardarse la categoría y si es facturable.

#### Scenario: Leído
- **WHEN** llega `read` para un mensaje `ENTREGADO`
- **THEN** el mensaje pasa a `LEIDO` con `leido_en`

#### Scenario: Estados fuera de orden
- **WHEN** llega `delivered` para un mensaje que ya está `LEIDO`
- **THEN** sigue `LEIDO` y se completa `entregado_en` si estaba vacío

#### Scenario: Estado duplicado
- **WHEN** Meta reenvía el mismo `delivered`
- **THEN** el resultado no cambia (idempotente)

### Requirement: Validar o invalidar el número del socio
Al recibir `delivered` o `read`, el socio del mensaje SHALL pasar a `whatsapp_estado = VALIDO`, salvo que esté en `BAJA`. Al recibir `failed` con un código de la lista configurable de errores que invalidan el número (por defecto `131026`, mensaje no entregable), el socio MUST pasar a `INVALIDO`, con el motivo y la fecha. Los errores que no dependen del número MUST NOT invalidarlo:
- `131049`: Meta decidió no entregar un marketing;
- `131047`: fuera de la ventana de 24 h;
- `130429`: límite de tasa;
- `131050`: el usuario frenó los mensajes de marketing. En este caso el socio pasa a `BAJA`.

#### Scenario: Número que no tiene WhatsApp
- **WHEN** llega `failed` con código `131026` para un socio `DESCONOCIDO`
- **THEN** el socio pasa a `INVALIDO` con motivo "131026 Message undeliverable"

#### Scenario: Marketing no entregado por Meta
- **WHEN** llega `failed` con código `131049`
- **THEN** el mensaje queda `FALLIDO` pero el estado del socio no cambia

#### Scenario: Número válido confirmado
- **WHEN** llega `delivered` para un socio `DESCONOCIDO`
- **THEN** el socio pasa a `VALIDO`

### Requirement: Baja por mensaje entrante
Un mensaje entrante (`messages`) de un número que coincide con un socio, cuyo texto o respuesta de botón normalizado (sin acentos ni mayúsculas, sin espacios extra) es una de las palabras de baja configuradas, SHALL pasar al socio a `whatsapp_estado = BAJA`. Los demás mensajes entrantes MUST guardarse como evento y quedar visibles en el historial como respuestas, asociados al último mensaje enviado a ese número.

#### Scenario: Socio responde BAJA
- **WHEN** el socio responde "baja"
- **THEN** su estado pasa a `BAJA` y queda excluido de las campañas de marketing

#### Scenario: Respuesta común
- **WHEN** el socio responde "Gracias!"
- **THEN** se registra la respuesta y su estado no cambia

### Requirement: Revisión manual del estado de WhatsApp del socio
`PUT /whatsapp/socios/{id}/estado` (admin) SHALL permitir cambiar `whatsapp_estado` a `DESCONOCIDO`, `VALIDO`, `INVALIDO` o `BAJA`, con un motivo obligatorio. Cuando se edita el teléfono de un socio con estado `INVALIDO`, el estado MUST volver a `DESCONOCIDO`.

#### Scenario: Teléfono corregido
- **WHEN** se actualiza el teléfono de un socio `INVALIDO`
- **THEN** su `whatsapp_estado` pasa a `DESCONOCIDO` y vuelve a ser enviable

### Requirement: Normalización del teléfono
El sistema SHALL normalizar el teléfono del socio al formato de WhatsApp de Argentina antes de enviar:
1. Quita todo lo que no sea dígito.
2. Quita el `0` del código de área y el `15` del celular.
3. Antepone `549` (el prefijo configurado) si no está.

Si el resultado no tiene entre 12 y 13 dígitos, el teléfono MUST considerarse no normalizable. El número normalizado MUST guardarse en `whatsapp_telefono_normalizado` para vincular los mensajes entrantes.

#### Scenario: Celular con 0 y 15
- **WHEN** el teléfono es "011 15-4444-5555"
- **THEN** se normaliza a `5491144445555`

#### Scenario: Teléfono incompleto
- **WHEN** el teléfono es "4444"
- **THEN** el socio se excluye con motivo `TELEFONO_INVALIDO`
