## ADDED Requirements

### Requirement: Crear una campaña con plantilla y audiencia
`POST /whatsapp/campanias` SHALL crear una campaña en estado `BORRADOR` con:
- nombre;
- descripción opcional;
- tipo: `CAMPANIA`, o `MASIVO` para los envíos rápidos;
- una plantilla en estado `APROBADA`;
- una definición de audiencia.

La audiencia MUST ser uno de estos tipos:
- `PREFERENCIA`: texto buscado, si incluye el resumen y sucursal, con los mismos criterios que `GET /reportes/preferencias`;
- `TODOS`: con filtro opcional por sucursal principal;
- `CUMPLEANIOS`: rango de días;
- `MANUAL`: lista de `socio_id`.

Las audiencias `PREFERENCIA` y `CUMPLEANIOS` MUST aceptar además una lista de `socio_id` excluidos a mano. Requiere un usuario admin.

#### Scenario: Plantilla no aprobada
- **WHEN** se crea una campaña con una plantilla `PENDIENTE`
- **THEN** responde 422 `PLANTILLA_NO_APROBADA`

#### Scenario: Campaña por preferencia
- **WHEN** se crea una campaña con audiencia `PREFERENCIA` `q=chocolate` y 3 socios excluidos
- **THEN** la campaña queda en `BORRADOR` con esa definición guardada

### Requirement: Calcular la audiencia con exclusiones
`GET /whatsapp/campanias/{id}/audiencia` SHALL resolver la audiencia y separar los destinatarios en dos grupos.

Son **enviables** los socios con teléfono normalizable y con `whatsapp_estado` en `DESCONOCIDO` o `VALIDO`.

Son **excluidos** los demás, cada uno con su motivo:
- `SIN_TELEFONO`;
- `TELEFONO_INVALIDO`: no se puede normalizar;
- `NUMERO_INVALIDO`: `whatsapp_estado = INVALIDO`;
- `BAJA`: dado de baja, en plantillas de categoría `MARKETING`;
- `DUPLICADO`: mismo número normalizado que otro destinatario.

La respuesta MUST incluir los totales por grupo y por motivo, y una página de destinatarios.

#### Scenario: Socio dado de baja en una campaña de marketing
- **WHEN** la audiencia incluye un socio con `whatsapp_estado = BAJA` y la plantilla es `MARKETING`
- **THEN** aparece como excluido con motivo `BAJA`

#### Scenario: Teléfono duplicado
- **WHEN** dos socios tienen el mismo número normalizado
- **THEN** solo el primero (menor id) es enviable y el otro se excluye como `DUPLICADO`

### Requirement: Vista previa de la campaña
`GET /whatsapp/campanias/{id}/vista-previa` SHALL devolver el mensaje renderizado para hasta 5 destinatarios de muestra, con las variables resueltas desde los datos de cada socio, y el costo estimado: enviables × tarifa configurada por categoría.

#### Scenario: Vista previa antes de confirmar
- **WHEN** un admin abre la vista previa de una campaña con 120 enviables
- **THEN** ve 5 mensajes de ejemplo personalizados, el total de 120 y el costo estimado

### Requirement: Iniciar el envío por lotes
`POST /whatsapp/campanias/{id}/enviar` SHALL congelar la audiencia: crea un registro en `whatsapp_mensajes` por destinatario enviable, con las variables ya resueltas y estado `PENDIENTE`. La campaña pasa a `EN_CURSO` y el sistema procesa el primer lote en la misma solicitud. Con `programada_para` en el futuro, la campaña MUST quedar `PROGRAMADA` y la primera invocación de `POST /whatsapp/lotes/procesar` posterior a esa hora la inicia. Una campaña sin enviables MUST rechazarse con 422 `AUDIENCIA_VACIA`. La operación MUST ser idempotente: si la campaña ya no está en `BORRADOR`, responde 409.

#### Scenario: Iniciar campaña
- **WHEN** se inicia una campaña con 300 enviables y lote de 50
- **THEN** se crean 300 mensajes `PENDIENTE`, se envían los primeros 50 y la campaña queda `EN_CURSO`

#### Scenario: Doble clic en enviar
- **WHEN** llegan dos solicitudes de envío para la misma campaña
- **THEN** solo una crea los mensajes y la otra responde 409

### Requirement: Procesar lotes pendientes
El endpoint `POST /whatsapp/lotes/procesar` (service token, invocado remotamente; no hay cron de Vercel) y el endpoint `POST /whatsapp/campanias/{id}/procesar` (admin) SHALL tomar hasta un lote de mensajes `PENDIENTE` de campañas `EN_CURSO` y procesarlo:
1. Bloquea los mensajes con `FOR UPDATE SKIP LOCKED` para que dos ejecuciones no envíen el mismo.
2. Llama a `POST /{phone_number_id}/messages` con la plantilla y los parámetros.
3. Guarda el `wamid` y pasa el mensaje a `ENVIADO`.
4. Ante un error, lo pasa a `FALLIDO` con código y mensaje.

Los errores de límite de tasa (`130429`, `131056`) y los errores 5xx MUST dejar el mensaje en `PENDIENTE` con `intentos + 1`, hasta 3 intentos. Cuando no quedan mensajes pendientes, la campaña MUST pasar a `FINALIZADA`. Si el token es inválido (error `190`), el job MUST pausar todas las campañas `EN_CURSO` con el motivo.

#### Scenario: Fin de campaña
- **WHEN** se procesa el último lote de una campaña
- **THEN** la campaña pasa a `FINALIZADA` con `finalizada_en`

#### Scenario: Límite de tasa
- **WHEN** Meta responde `130429` para un mensaje
- **THEN** el mensaje sigue `PENDIENTE` con `intentos = 1` y se reintenta en el próximo lote

#### Scenario: Token vencido durante el envío
- **WHEN** Meta responde error `190`
- **THEN** las campañas `EN_CURSO` pasan a `PAUSADA` con motivo "Token de acceso inválido"

### Requirement: Procesar lotes desde otro sistema con service token
`POST /whatsapp/lotes/procesar` SHALL ejecutar un ciclo de envío: inicia las campañas `PROGRAMADA` cuya hora llegó y envía hasta un lote de mensajes pendientes. La respuesta MUST incluir los enviados, los fallidos, los reintentos, las campañas finalizadas y los `pendientes` que quedan.

El endpoint MUST autenticarse con un service token, no con el JWT de usuario. El token se envía en `Authorization: Bearer <token>` o en `X-Service-Token: <token>`, y se compara en tiempo constante contra los tokens configurados en `SERVICE_TOKENS`, separados por coma para permitir rotarlos. Cada token MUST tener al menos 32 caracteres.

El endpoint responde:
- 503 si no hay ningún token válido configurado (el endpoint nunca queda abierto);
- 401 si el token falta o no coincide;
- 404 si `campania_id` no existe.

Admite como parámetros opcionales `campania_id`, `limite` (1–500) y `respetar_pausa`. Con la integración desactivada responde 200 con `activo: false` y no envía nada.

#### Scenario: Token válido
- **WHEN** un sistema externo llama con `Authorization: Bearer <token configurado>` y hay 3 mensajes pendientes con lote de 2
- **THEN** se envían 2 y la respuesta indica `pendientes: 1`

#### Scenario: Rotación de tokens
- **WHEN** `SERVICE_TOKENS` tiene dos tokens y el cliente usa el segundo en `X-Service-Token`
- **THEN** la llamada se acepta

#### Scenario: Sin token o token incorrecto
- **WHEN** se llama sin header, con un token que no está configurado o con el JWT de un admin
- **THEN** responde 401 y no se envía nada

#### Scenario: Sin tokens configurados
- **WHEN** `SERVICE_TOKENS` está vacío o solo tiene tokens de menos de 32 caracteres
- **THEN** responde 503

### Requirement: Pausar, reanudar y cancelar
`POST /whatsapp/campanias/{id}/pausar`, `/reanudar` y `/cancelar` SHALL cambiar el estado de la campaña. Una campaña `PAUSADA` MUST NOT enviar mensajes. Cancelar MUST pasar los mensajes `PENDIENTE` a `CANCELADO` y la campaña a `CANCELADA`. Los mensajes ya enviados no se ven afectados.

#### Scenario: Cancelar a mitad de envío
- **WHEN** se cancela una campaña con 100 enviados y 200 pendientes
- **THEN** los 200 pendientes quedan `CANCELADO` y los 100 enviados siguen recibiendo estados

### Requirement: Mensaje masivo rápido
`POST /whatsapp/envios-masivos` SHALL crear e iniciar en un solo paso una campaña de tipo `MASIVO`, con plantilla, audiencia y valores para las variables de `texto_fijo`. El nombre se genera automáticamente ("Envío masivo dd/mm/aaaa hh:mm"). Las mismas reglas de exclusión, lotes y seguimiento de una campaña MUST aplicarse.

#### Scenario: Envío masivo a todos los socios de una sucursal
- **WHEN** un admin envía la plantilla `aviso_horario` a la audiencia `TODOS` de la sucursal "Centro"
- **THEN** se crea una campaña `MASIVO` `EN_CURSO` con los socios enviables de esa sucursal

### Requirement: Crear campaña desde el reporte de preferencias
En la pantalla "Por preferencia", el frontend SHALL permitir seleccionar socios de los resultados (todos o algunos) y elegir "Crear campaña de WhatsApp". Esto abre el armado de campaña con la audiencia `PREFERENCIA` precargada con la búsqueda actual, y los socios desmarcados como excluidos. Si se eligen menos de la mitad, la audiencia se precarga como `MANUAL` con los socios marcados.

#### Scenario: Selección parcial
- **WHEN** el usuario busca "sin tacc", desmarca 2 de 40 resultados y elige "Crear campaña"
- **THEN** la campaña nueva tiene audiencia `PREFERENCIA` `q="sin tacc"` con esos 2 socios excluidos

### Requirement: Listar campañas
`GET /whatsapp/campanias` SHALL listar las campañas ordenadas por fecha de creación descendente, con filtros por estado, tipo y rango de fechas. Cada campaña MUST incluir la plantilla y los contadores: destinatarios, enviados, entregados, leídos, fallidos y pendientes.

#### Scenario: Filtrar campañas en curso
- **WHEN** se filtra por estado `EN_CURSO`
- **THEN** solo aparecen campañas en curso, con su avance
