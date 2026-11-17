## Context

- **Frontend** (`panacea-socios`, este repo): React 19 + Vite, React Router, react-hook-form + zod, TanStack Table (`DataGrid`), Recharts, y axios vía `src/services/sociosApi.js`. El menú está en `AppLayout.jsx` (`NAV`, con grupos). Para los reportes se usan `useSessionState` y `useScrollRestore`, y `PreferenciasPage` ya busca socios por preferencia y exporta CSV.
- **Backend** (`panacea-socios-backend`, repo hermano): FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL, desplegado en **Vercel serverless**. La autenticación usa `passport.authenticate("jwt")` y `require_admin` (`ADMIN_EMAILS`). Los procesos de fondo corren como endpoints `/jobs/*` llamados por Vercel Cron con `CRON_SECRET`. Ya existen `perfiles_socio` (etiquetas, categorías y productos favoritos), `/reportes/preferencias` con `unaccent` y filtro de sucursal principal (`lugar`), y `httpx` como dependencia.
- **Socio**: `telefono` es texto libre, de hasta 30 caracteres y sin normalizar. No hay ningún dato de consentimiento ni de estado de contacto.
- **Meta**: la referencia es la guía del artefacto "WhatsApp Cloud API". Allí están los parámetros, el webhook suscripto a `messages` y `message_template_status_update`, los estados `sent/delivered/read/failed`, la baja con "BAJA" y el `131049`. Los endpoints concretos se toman de developers.facebook.com/docs/whatsapp, que tiene precedencia.

El trabajo está repartido entre los dos repos. Los artefactos de este cambio viven en el frontend, pero la mayor parte de las tareas son del backend.

## Goals / Non-Goals

**Goals:**
- Un admin configura la integración con Meta desde la app, sin tocar variables de entorno, salvo la clave de cifrado.
- Plantillas reutilizables con variables mapeadas a datos del socio, aprobadas por Meta y sincronizadas.
- Campañas y envíos masivos que respetan los límites de Vercel (sin procesos largos), son idempotentes y no envían duplicados.
- Estados de entrega y lectura confiables vía webhook, con invalidación automática de números malos y baja de marketing.
- Reportes de monitoreo de campañas y de calidad de la base de teléfonos.

**Non-Goals:**
- Bandeja de chat bidireccional o atención al cliente: las respuestas se registran, pero no se contestan desde la app.
- Mensajes de texto libre masivos: Meta solo los permite dentro de la ventana de 24 h.
- Plantillas con media (imagen o documento) en el encabezado, plantillas de autenticación y carruseles. Quedan para una iteración posterior; el modelo deja lugar para `encabezado_tipo`.
- Segmentación avanzada combinando varios criterios (preferencia AND sucursal AND puntos). En esta etapa hay un criterio por campaña, más sucursal y exclusiones.
- Multi-número o multi-WABA.
- Recordatorios automáticos disparados por eventos (cumpleaños, puntos por vencer).

## Decisions

### 1. Configuración en base de datos, secretos cifrados con Fernet
Una tabla `whatsapp_configuracion` de una sola fila (`id = 1`). El `access_token`, el `app_secret` y el `webhook_verify_token` se cifran con `cryptography.fernet`, con una clave tomada de `WHATSAPP_ENCRYPTION_KEY` o, si no existe, derivada de `SECRET_KEY` con SHA-256 → base64. La API nunca los devuelve completos.

- *Por qué*: el usuario pidió "una configuración donde se configuren todos los parámetros"; con variables de entorno, cada cambio exige redeploy en Vercel.
- *Alternativa descartada*: solo variables de entorno. Es más simple y seguro, pero no cumple el pedido.
- *Riesgo*: rotar `SECRET_KEY` sin definir `WHATSAPP_ENCRYPTION_KEY` deja ilegibles los secretos. Por eso se documenta usar la variable dedicada.

### 2. Cliente de Graph API como servicio inyectable
`app/services/whatsapp/meta_client.py` usa `httpx` y expone `enviar_plantilla`, `crear_plantilla`, `listar_plantillas`, `info_numero` y `enviar_texto` (solo para pruebas). Lanza `MetaError(codigo, subcodigo, titulo, detalle, http_status)`. Se inyecta con `Depends(get_meta_client)` para reemplazarlo en los tests, igual que `get_anthropic_client`. La versión de Graph API sale de la configuración.

### 3. Envío por lotes con cola en tabla + invocación remota + disparo manual
Las funciones de Vercel tienen tiempo máximo, así que no se puede enviar a miles de socios en una sola request. Al iniciar la campaña se **congela la audiencia** en `whatsapp_mensajes` (`PENDIENTE`), con las variables ya resueltas en `parametros` (JSONB). Después, cada ejecución de `procesar_lote(db, client, limite)`:

1. Selecciona hasta `tamanio_lote` mensajes `PENDIENTE` de campañas `EN_CURSO`, en orden por id, con `FOR UPDATE SKIP LOCKED`.
2. Los envía secuencialmente, con un presupuesto de tiempo de unos 40 s.
3. Hace commit de cada mensaje. Así, si la función se corta, los ya enviados quedan registrados y no se reenvían.

Lo disparan tres cosas:
- el endpoint de inicio, que procesa el primer lote;
- `POST /whatsapp/lotes/procesar`, invocado remotamente por otro sistema con un service token;
- `POST /whatsapp/campanias/{id}/procesar`, desde el botón del detalle y el auto-refresco.

- *Alternativa descartada*: una cola externa (QStash, SQS) o un worker dedicado. Agrega infraestructura nueva; se puede sumar más adelante sin cambiar el modelo.
- *Sin cron de Vercel*: la frecuencia la decide el sistema que invoca el endpoint (se llama mientras la respuesta tenga `pendientes > 0`). Las campañas programadas arrancan en la primera invocación posterior a su hora.
- *Idempotencia de inicio*: `UPDATE whatsapp_campanias SET estado='EN_CURSO' WHERE id=:id AND estado='BORRADOR' RETURNING id`. Si no devuelve fila, la respuesta es 409.
- *Anti-duplicado*: índice único `(campania_id, socio_id)` en `whatsapp_mensajes`, más deduplicación por teléfono normalizado al congelar la audiencia.

### 4. Resolución de variables al congelar
Un solo módulo `variables.py` define el catálogo de campos (`CAMPOS_SOCIO`), con una función por campo: `primer_nombre` toma la primera palabra de `nombre_apellido` en formato título, `saldo_puntos` sale de `socios.saldo_puntos`, `sucursal_principal` reutiliza el SQL de lugar principal de `reportes.py`, y `preferencia_principal` es la primera etiqueta del perfil.

La vista previa, el congelado y el endpoint de campos usan este mismo catálogo. Se resuelve al congelar, y no al enviar, para que lo que se previsualizó sea lo que se envía y para auditar el mensaje exacto. El texto renderizado se guarda en `whatsapp_mensajes.texto`.

### 5. Audiencias como definición guardada + reutilización de consultas
`whatsapp_campanias.audiencia` (JSONB) guarda `{tipo, q, incluir_resumen, lugar, desde, hasta, socio_ids, excluidos}`. La resolución reutiliza la lógica de `reportes.py`:

- `PREFERENCIA` reutiliza `_SOCIOS_POR_PREFERENCIA_SQL` sin paginar.
- `CUMPLEANIOS` reutiliza la consulta de cumpleaños.

Para eso, esas consultas se extraen a `app/services/audiencias.py` sin cambiar el comportamiento de los reportes. Las exclusiones (sin teléfono, número inválido, baja, duplicado) se calculan en Python sobre el resultado.

### 6. Estado de WhatsApp en `socios`
Se agregan cuatro columnas: `whatsapp_estado` (`DESCONOCIDO` por defecto), `whatsapp_estado_motivo`, `whatsapp_estado_actualizado_en` y `whatsapp_telefono_normalizado` (indexada). Van en `socios` y no en una tabla aparte porque se filtra por ellas en cada audiencia y en el reporte.

El número normalizado se recalcula en la migración (backfill) y cada vez que cambia `telefono`, en el `PUT` de socios y en el alta. Si cambia el teléfono de un socio `INVALIDO`, el estado vuelve a `DESCONOCIDO`.

- `BAJA` es una sola bandera que bloquea marketing. Las plantillas `UTILITY` igual se pueden enviar.

### 7. Webhook: firma, eventos crudos, procesamiento en la misma request
`POST /whatsapp/webhook` lee el cuerpo crudo (`await request.body()`), valida HMAC-SHA256 con `app_secret` y guarda cada cambio en `whatsapp_eventos`. Después lo procesa en la misma request: son updates puntuales por `wamid`, que tiene índice único.

- Los estados avanzan con un `rank` (`ENVIADO=1`, `ENTREGADO=2`, `LEIDO=3`). `FALLIDO` solo se aplica si el mensaje no llegó a `ENTREGADO`.
- Los mensajes entrantes se vinculan por `whatsapp_telefono_normalizado`. Como Meta a veces envía números argentinos sin el `9`, se compara también con la variante sin el `9`.
- Los errores al procesar se registran en el evento (`procesado=false`, `error`) y se responde 200 de todos modos.
- *Alternativa descartada*: encolar los eventos y procesarlos con el cron. Agrega latencia sin necesidad, porque el volumen es bajo.

### 8. Reglas de invalidación configurables
`codigos_invalidan` es un array de la configuración, por defecto `[131026]`. Los códigos `131050` (opt-out de marketing) → `BAJA` y `131049`/`131047`/`130429`/`131056` → sin cambio quedan fijos en código. Así se evita invalidar números buenos por errores transitorios, como advierte la guía con el `131049`.

### 9. Modelo de datos (resumen)
- `whatsapp_configuracion`: una sola fila. Campos de Meta (con los secretos `*_cifrado`), `idioma_defecto`, `prefijo_pais`, `numero_prueba`, `tamanio_lote`, `pausa_lotes_seg`, `palabras_baja` (JSONB), `codigos_invalidan` (JSONB), `tarifas` (JSONB `{marketing, utility, service, moneda}`), `activo` y `actualizado_por`/`actualizado_en`.
- `whatsapp_plantillas`:
  - `id`, `nombre_meta`, `nombre`, `categoria`, `idioma`;
  - `encabezado`, `cuerpo`, `pie`, `botones` (JSONB) y `variables` (JSONB `[{n, origen, campo|texto, ejemplo, defecto, en:"cuerpo"|"encabezado"}]`);
  - `estado`, `motivo_rechazo`, `meta_template_id`, `origen` (`LOCAL`/`IMPORTADA`), `archivada`;
  - fechas y creador;
  - único `(nombre_meta, idioma)`.
- `whatsapp_campanias`:
  - `id`, `nombre`, `descripcion`, `tipo`, `plantilla_id`, `audiencia` (JSONB), `valores_fijos` (JSONB);
  - `estado` (`BORRADOR`, `PROGRAMADA`, `EN_CURSO`, `PAUSADA`, `FINALIZADA`, `CANCELADA`) y `motivo_estado`;
  - `programada_para`, `iniciada_en`, `finalizada_en`;
  - `total_destinatarios` y `excluidos` (JSONB con conteos por motivo);
  - `creado_por` y fechas.
- `whatsapp_mensajes`:
  - `id`, `campania_id` (nullable para pruebas), `socio_id` (nullable), `telefono`, `plantilla_id`, `parametros` (JSONB), `texto`;
  - `estado`, `intentos`, `wamid` (único);
  - `enviado_en`, `entregado_en`, `leido_en`, `fallido_en`;
  - `error_codigo`, `error_titulo`, `error_detalle`;
  - `pricing_categoria`, `facturable`;
  - `respuesta_texto` y `respuesta_en`;
  - índices por `(campania_id, estado)` y `(socio_id)`; único `(campania_id, socio_id)`.
- `whatsapp_eventos`: `id`, `tipo`, `wamid`, `payload` (JSONB), `recibido_en`, `procesado`, `error`.

Los contadores de las campañas se calculan con `COUNT … FILTER` sobre `whatsapp_mensajes`, gracias al índice `(campania_id, estado)`. No se cachean.

### 10. Frontend
Agrega un grupo "WhatsApp" en `NAV` con estas entradas:
- Campañas: `/whatsapp/campanias`, lista y detalle `/whatsapp/campanias/:id`;
- Nueva campaña: un wizard en `/whatsapp/campanias/nueva` con 3 pasos (plantilla → audiencia → vista previa y confirmar);
- Envío masivo: `/whatsapp/envio-masivo`;
- Plantillas: `/whatsapp/plantillas` y `/whatsapp/plantillas/:id`, con editor y vista previa en vivo con formato tipo burbuja de WhatsApp;
- Mensajes: `/whatsapp/mensajes`;
- Reportes: `/whatsapp/reportes`, con el tablero y la pestaña de no contactables;
- Configuración: `/whatsapp/configuracion`.

La API de WhatsApp va en `src/services/whatsappApi.js`, aparte de `sociosApi.js` para no inflarlo, y comparte el `client` exportado desde `api.js`/`sociosApi.js`.

Las entradas de admin se ocultan si el usuario no es admin. Si el `AuthContext` no expone el rol, se agrega `es_admin` a la respuesta de `/auth/me`, o se infiere de un 403. Ver tareas.

`PreferenciasPage` suma checkboxes en los resultados y el botón "Crear campaña de WhatsApp", que navega al wizard con la audiencia en el `state` del router.

Los formularios usan react-hook-form + zod, las tablas usan `DataGrid` y los gráficos usan `components/charts`.

## Risks / Trade-offs

- [Si el sistema externo deja de invocar el endpoint, los envíos se frenan] → el detalle de la campaña abierto y el botón "Procesar lote" siguen avanzando el envío. Las campañas programadas no arrancan hasta la próxima invocación.
- [Límites de Meta: tier de mensajería (250, 1k, 10k… destinatarios únicos por 24 h) y calidad del número] → el tamaño de lote es configurable, "Probar conexión" muestra el *quality rating* y los errores `131056`/`130429` se reintentan. La vista previa advierte si los enviables superan el tier informado.
- [Envío duplicado si la función muere después de que Meta aceptó y antes del commit] → hay commit por mensaje y el riesgo queda acotado a un mensaje por corte. Se acepta.
- [Costos: el marketing es pago por mensaje] → la vista previa muestra el costo estimado y el envío pide confirmación explícita con el total.
- [Teléfonos mal cargados (fijos, sin código de área)] → la normalización es conservadora y excluye en vez de adivinar. El reporte de no contactables sirve para depurar.
- [Webhook público expuesto] → firma HMAC obligatoria. Sin `app_secret` configurado, el POST responde 503 y no procesa.
- [Privacidad / consentimiento] → la baja con "BAJA" se respeta siempre en marketing. Se recomienda que el pie de las plantillas de marketing diga "Respondé BAJA para no recibir más mensajes"; el editor lo sugiere.
- [Meta cambia los nombres de los estados de plantilla o los códigos de error] → los mapeos se centralizan en un solo módulo y los eventos crudos se guardan para reprocesar.

## Migration Plan

1. Backend: crear la migración `0006_whatsapp` con las 5 tablas y las 4 columnas en `socios`, y el backfill de `whatsapp_telefono_normalizado`. El downgrade elimina todo.
2. Deploy del backend con `WHATSAPP_ENCRYPTION_KEY` definida. Definir `SERVICE_TOKENS` y configurar el sistema externo que invoca `POST /whatsapp/lotes/procesar`.
3. Un admin carga la configuración, hace "Probar conexión" y carga en Meta la URL del webhook y el verify token que muestra la pantalla. Después se suscribe a `messages` y `message_template_status_update`.
4. Sincronizar plantillas, enviar un mensaje de prueba y verificar que llegan los estados.
5. Deploy del frontend.

Rollback: `activo = false` frena todos los envíos de inmediato. Si hace falta, se puede revertir el deploy y hacer `alembic downgrade` (se pierden el historial y las plantillas locales).

## Open Questions

- ¿Cómo se identifica a un admin en el frontend hoy? Hay que confirmar si `/auth/me` o el JWT exponen el rol.
- ¿El "creador" de campañas y plantillas debe ser solo admin, o también otro rol de staff (por ejemplo, vendedores que solo vean reportes)? Por ahora todo es admin.
- ¿Tarifas en USD o en la moneda de facturación elegida en Meta? La guía advierte que la moneda no se puede cambiar después.
- ¿Se necesita en esta etapa una plantilla con imagen (promos con foto del producto)? Quedó fuera del alcance.
