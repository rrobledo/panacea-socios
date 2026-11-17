> Las secciones 1 a 8 son del repo `panacea-socios-backend`; las secciones 9 a 13 son del repo `panacea-socios` (frontend).

## 1. Backend: base, modelos y migración

- [x] 1.1 Agregar a `Settings`: `whatsapp_encryption_key`, más una función que derive la clave Fernet de `secret_key` si la anterior está vacía. Verificar que `cryptography` esté en `requirements.txt` explícitamente.
- [x] 1.2 Crear `app/services/whatsapp/cifrado.py` con `cifrar(texto)` y `descifrar(token)`.
- [x] 1.3 Crear los modelos `WhatsappConfiguracion`, `WhatsappPlantilla`, `WhatsappCampania`, `WhatsappMensaje` y `WhatsappEvento` en `app/models/whatsapp.py`, con sus clases de estados y su registro en `app/models/__init__.py`.
- [x] 1.4 Agregar a `Socio` las columnas `whatsapp_estado`, `whatsapp_estado_motivo`, `whatsapp_estado_actualizado_en` y `whatsapp_telefono_normalizado` (indexada).
- [x] 1.5 Crear la migración Alembic `0006_whatsapp` con las tablas, índices y únicos (`wamid`; `(campania_id, socio_id)`; `(nombre_meta, idioma)`), las columnas nuevas de `socios` y el backfill del teléfono normalizado. Incluir el downgrade.
- [x] 1.6 Crear `app/services/whatsapp/telefonos.py` con `normalizar(telefono, prefijo)` y `variantes_ar(numero)` (con y sin `9`), más sus tests unitarios con los casos del spec.

## 2. Backend: cliente de Meta y configuración

- [x] 2.1 Crear `app/services/whatsapp/meta_client.py` (httpx) con `MetaError` y estas funciones: `info_numero`, `enviar_plantilla`, `crear_plantilla`, `listar_plantillas` (paginado) y `enviar_texto`. Agregar `get_meta_client` como dependencia inyectable.
- [x] 2.2 Crear el servicio `obtener_config(db)` con los valores por defecto, y `requerir_config_activa(db)`, que lanza 409 `WHATSAPP_NO_CONFIGURADO`.
- [x] 2.3 Crear los schemas Pydantic de configuración: entrada con secretos opcionales y salida enmascarada (`*_cargado`, `*_final`, `webhook_url`, `configurado`).
- [x] 2.4 Crear el router `/whatsapp/configuracion` con `GET`, `PUT`, `POST /probar` y `POST /mensaje-prueba`, todos con `require_admin`. El mensaje de prueba queda registrado en `whatsapp_mensajes`.
- [x] 2.5 Escribir tests: guardar sin pisar secretos, enmascarado, 403 para no admins, y probar conexión con el cliente mockeado (ok y error 190).

## 3. Backend: plantillas y variables

- [x] 3.1 Crear `app/services/whatsapp/variables.py` con el catálogo `CAMPOS_SOCIO`. Para resolver cada campo, reutilizar el SQL de sucursal principal y la primera etiqueta del perfil. Incluir `resolver_parametros(db, plantilla, socios, valores_fijos)` y `renderizar(plantilla, parametros)`.
- [x] 3.2 Crear las validaciones de plantilla: formato de `nombre_meta`, longitudes, variables consecutivas y definidas, variables que no estén al inicio, al final ni pegadas, y botones (hasta 3).
- [x] 3.3 Crear el router `/whatsapp/plantillas` con estas operaciones: listar (filtros y uso), crear, editar (solo `BORRADOR`/`RECHAZADA`), copiar, eliminar/archivar, `GET /campos` y `POST /{id}/vista-previa`.
- [x] 3.4 Agregar `POST /{id}/enviar-aprobacion`, que arma los `components` con ejemplos, llama a `crear_plantilla` y maneja el rechazo y el duplicado.
- [x] 3.5 Agregar `POST /sincronizar`, que mapea los estados de Meta e importa las plantillas que no existen localmente con origen `IMPORTADA`.
- [x] 3.6 Escribir tests de validaciones, vista previa con dato vacío (usa el valor por defecto), sincronización e importación con el cliente mockeado.

## 4. Backend: audiencias

- [x] 4.1 Extraer las consultas de preferencias y cumpleaños de `app/routers/reportes.py` a `app/services/audiencias.py`, sin cambiar las respuestas de los reportes. Correr `tests/test_reportes.py`.
- [x] 4.2 Crear `resolver_audiencia(db, audiencia, categoria)` para los tipos `PREFERENCIA`, `TODOS` (+ `lugar`), `CUMPLEANIOS` y `MANUAL`, con exclusiones manuales. Devuelve los enviables y los excluidos por motivo (`SIN_TELEFONO`, `TELEFONO_INVALIDO`, `NUMERO_INVALIDO`, `BAJA` en marketing, `DUPLICADO`).
- [x] 4.3 Escribir tests de cada tipo de audiencia y de cada motivo de exclusión.

## 5. Backend: campañas y envío por lotes

- [x] 5.1 Crear los schemas de campaña: entrada, salida con contadores (`COUNT FILTER`) y audiencia.
- [x] 5.2 Crear el router `/whatsapp/campanias` con: listar (filtros), crear, editar (en `BORRADOR`), detalle, `GET /{id}/audiencia` (paginada) y `GET /{id}/vista-previa` (5 muestras + costo estimado).
- [x] 5.3 Crear el servicio `iniciar_campania`: transición atómica `BORRADOR→EN_CURSO` (409 si no aplica), congelado de mensajes `PENDIENTE` con `parametros` y `texto`, conteo de excluidos, 422 `AUDIENCIA_VACIA`, y soporte de `programada_para` → `PROGRAMADA`.
- [x] 5.4 Crear el servicio `procesar_lote(db, client, campania_id=None)`:
  - toma mensajes con `FOR UPDATE SKIP LOCKED`, con presupuesto de tiempo y commit por mensaje;
  - reintenta `130429`/`131056`/5xx hasta 3 veces;
  - ante `190`, pausa las campañas `EN_CURSO`;
  - cierra como `FINALIZADA` las campañas sin pendientes.
- [x] 5.5 Agregar `POST /{id}/enviar`, `/procesar`, `/pausar`, `/reanudar` y `/cancelar` (pendientes → `CANCELADO`).
- [x] 5.6 Crear `POST /whatsapp/envios-masivos`: crea e inicia una campaña `MASIVO` con nombre automático.
- [x] 5.7 Agregar el job `GET /jobs/whatsapp` (`CRON_SECRET`): inicia las `PROGRAMADA` vencidas y procesa un lote. Agregar el cron `*/5 * * * *` en `vercel.json`.
- [x] 5.8 Escribir tests de envío (con el cliente mockeado): doble inicio → 409, lote parcial, reintento por límite de tasa, pausa por token vencido, cancelación y fin de campaña.

- [x] 5.9 Agregar `POST /whatsapp/lotes/procesar` con service token (`SERVICE_TOKENS`, en `Authorization: Bearer` o `X-Service-Token`, comparación en tiempo constante, 503 si no hay tokens y 401 si no coincide). Compartir con el cron la función `ejecutar_ciclo`. Escribir sus tests.

## 6. Backend: webhook y seguimiento

- [x] 6.1 Crear `GET /whatsapp/webhook` con verificación de `hub.verify_token` y respuesta del `hub.challenge` en texto plano.
- [x] 6.2 Crear `POST /whatsapp/webhook`: lee el cuerpo crudo, valida `X-Hub-Signature-256` con `hmac.compare_digest` (401 si no coincide, 503 sin `app_secret`), guarda `whatsapp_eventos` y responde siempre 200 a los eventos válidos.
- [x] 6.3 Procesar los estados: avance monótono por rank, fechas por hito, `read` completa `entregado_en`, `failed` con datos de error, `pricing`. Debe ser idempotente.
- [x] 6.4 Aplicar las reglas al socio: `delivered`/`read` → `VALIDO` (salvo `BAJA`), `codigos_invalidan` → `INVALIDO`, `131050` → `BAJA`, y los demás códigos no cambian el estado.
- [x] 6.5 Procesar los mensajes entrantes: vincular por teléfono normalizado (y sus variantes), detectar las palabras de baja normalizadas (`unaccent` o `unicodedata`) → `BAJA`, y guardar `respuesta_texto` en el último mensaje enviado.
- [x] 6.6 Procesar `message_template_status_update` con el mismo mapeo de estados de plantilla.
- [x] 6.7 Crear `PUT /whatsapp/socios/{id}/estado` (admin, motivo obligatorio). Al editar el teléfono en el `PUT` y en el alta de socios, recalcular el número normalizado y pasar `INVALIDO` → `DESCONOCIDO`.
- [x] 6.8 Escribir tests: verificación GET, firma inválida, secuencias de estados fuera de orden y duplicadas, invalidación por `131026`, no invalidación por `131049`, baja por "Baja " y cambio de teléfono.

## 7. Backend: reportes

- [x] 7.1 Crear `GET /whatsapp/reportes/resumen?desde&hasta`: totales por estado, tasas, campañas por estado, serie diaria, top 5 por lectura, top 5 errores, y facturables y costo por categoría.
- [x] 7.2 Crear `GET /whatsapp/mensajes`: filtros (socio, campaña, estado, código de error, fechas) y paginación. Crear también `GET /whatsapp/campanias/{id}/mensajes` con filtro por estado.
- [x] 7.3 Crear `GET /whatsapp/reportes/socios-no-contactables`: motivo, sucursal, último error y paginación.
- [x] 7.4 Escribir tests de cálculo de tasas y costos con datos de ejemplo del spec.

## 8. Backend: cierre

- [x] 8.1 Registrar los routers en `app/main.py`, con docstrings y tags para `/docs`. Regenerar `openapi.json`.
- [x] 8.2 Exponer `es_admin` en `/auth/me`, o en la respuesta de login o callback, para que el frontend oculte las secciones de admin (si no existe ya).
- [x] 8.3 Documentar en el README: variables nuevas, URL del webhook, suscripciones en Meta (`messages`, `message_template_status_update`), cron y la guía de referencia.

## 9. Frontend: base y navegación

- [x] 9.1 Crear `src/services/whatsappApi.js` con todas las llamadas `/whatsapp/*`, reutilizando el cliente axios con JWT.
- [x] 9.2 Agregar el grupo "WhatsApp" a `NAV` en `AppLayout.jsx`, con las entradas Campañas, Envío masivo, Plantillas, Mensajes, Reportes y Configuración. Ocultar las de admin según `es_admin`.
- [x] 9.3 Registrar las rutas `/whatsapp/*` en `App.jsx` y crear la carpeta `src/pages/whatsapp/`.
- [x] 9.4 Crear los componentes compartidos: `EstadoBadge` (estados de mensaje, campaña, plantilla y socio), `BurbujaWhatsapp` (vista previa con formato `*negrita*` / `_cursiva_`) y `AudienciaResumen`.

## 10. Frontend: configuración y plantillas

- [x] 10.1 Crear `ConfiguracionWhatsappPage`, un formulario (react-hook-form + zod) con secciones Meta, Webhook, Envío y Tarifas:
  - secretos con placeholder "••••a1b2 (dejar vacío para mantener)";
  - URL del webhook copiable;
  - botones "Probar conexión" y "Enviar mensaje de prueba" con su resultado.
- [x] 10.2 Crear `PlantillasPage`: grilla con estado, categoría, idioma y uso; acciones "Sincronizar con Meta", nueva, copiar y archivar.
- [x] 10.3 Crear `PlantillaEditorPage`:
  - campos de la plantilla e inserción de variables `{{n}}`;
  - mapeo de cada variable (campo del socio o texto fijo, con ejemplo y valor por defecto);
  - validación en vivo de las reglas de Meta y sugerencia del pie "Respondé BAJA…";
  - vista previa con burbuja (ejemplos o un socio buscado por DNI/nombre);
  - botón "Enviar a aprobación".

## 11. Frontend: campañas y envío masivo

- [x] 11.1 Crear `CampaniasPage`: lista con filtros (estado, tipo, fechas), barra de avance y tasas por campaña.
- [x] 11.2 Crear `NuevaCampaniaPage`, un wizard de 3 pasos:
  1. Datos y plantilla aprobada.
  2. Audiencia: tipo `PREFERENCIA` (buscador con etiquetas y selección), `TODOS` + sucursal, `CUMPLEANIOS` o `MANUAL`, con exclusiones.
  3. Vista previa: 5 burbujas, enviables, excluidos por motivo y costo estimado. Confirmación explícita con el total, enviar ahora o programar.
- [x] 11.3 Crear `CampaniaDetallePage`:
  - indicadores y embudo; auto-refresco cada 10 s mientras está `EN_CURSO`;
  - botones Procesar lote, Pausar, Reanudar y Cancelar;
  - grilla de destinatarios con filtro por estado y export CSV;
  - ver la respuesta del socio e ir a la ficha.
- [x] 11.4 Crear `EnvioMasivoPage`: plantilla, audiencia (`TODOS`/sucursal, `CUMPLEANIOS` o `MANUAL`), valores fijos, vista previa y enviar. Al terminar, redirigir al detalle de la campaña `MASIVO` creada.
- [x] 11.5 En `PreferenciasPage`, agregar checkboxes de selección (todos o ninguno) y el botón "Crear campaña de WhatsApp", que navega al wizard con la audiencia precargada (`PREFERENCIA` con excluidos, o `MANUAL` si se eligió menos de la mitad).

## 12. Frontend: seguimiento y reportes

- [x] 12.1 Crear `MensajesWhatsappPage`: historial con filtros (socio, campaña, estado, código de error, fechas), paginación y persistencia con `useSessionState` y `useScrollRestore`.
- [x] 12.2 Crear `ReportesWhatsappPage`:
  - selector de período;
  - tarjetas de totales y tasas;
  - embudo y serie diaria (Recharts, según el skill de dataviz);
  - top campañas, top errores y costos por categoría.
- [x] 12.3 Agregar la pestaña "No contactables" en `ReportesWhatsappPage`: filtros por motivo y sucursal, export CSV, ir al socio y "Restablecer estado" (con motivo).
- [x] 12.4 En `SocioResumen`, mostrar el badge de `whatsapp_estado` y la sección "WhatsApp" con los últimos mensajes y su estado.

## 13. Verificación de punta a punta

- [x] 13.1 Correr `pytest` en el backend y `npm run lint` y `npm run build` en el frontend.
- [ ] 13.2 Con la WABA de prueba de Meta:
  1. Cargar la configuración, probar la conexión, verificar el webhook (con ngrok en local) y enviar `hello_world`.
  2. Crear y aprobar una plantilla con variables, y mandar una campaña a los números de prueba.
  3. Verificar los estados entregado y leído, y la baja con "BAJA".
- [ ] 13.3 Probar un número inexistente: debe quedar `FALLIDO` con `131026`, el socio `INVALIDO` y aparecer en "No contactables".
