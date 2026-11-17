## Why

Panacea ya conoce las preferencias de cada socio (perfiles generados con IA, reporte "Por preferencia"), pero no tiene forma de usar ese conocimiento para comunicarse con ellos. Hoy el equipo exporta un CSV y contacta a mano. Integrar la **WhatsApp Cloud API de Meta** permite mandar campañas segmentadas y masivas desde la propia app, medir si llegaron y se leyeron, y detectar los socios con teléfono incorrecto para depurar la base.

La guía de referencia (artefacto "WhatsApp Cloud API") define los parámetros de integración (versión de Graph API, token permanente, Phone number ID, WABA ID, App ID, webhook y verify token), las reglas de plantillas (categorías, nombre en minúsculas con `_`, idioma `es_AR`, variables `{{1}}…` con ejemplo), los estados del webhook (`sent`, `delivered`, `read`, `failed`), la baja por respuesta "BAJA" y el error `131049`. Este cambio se apoya en esa guía.

## What Changes

- **Configuración de Meta**: pantalla de administración (solo admins) para cargar y validar todos los parámetros de integración con la WhatsApp Cloud API. Los secretos se guardan cifrados y nunca se devuelven completos. Incluye "Probar conexión" y "Enviar mensaje de prueba".
- **Plantillas de campaña**: ABM de plantillas con cuerpo, encabezado y pie opcionales, botones, categoría e idioma. Las **variables** se mapean a datos del socio (nombre, primer nombre, saldo de puntos, sucursal principal, cumpleaños, etc.) o a un texto fijo. Las plantillas se envían a Meta para su aprobación y su estado se sincroniza (`PENDIENTE`, `APROBADA`, `RECHAZADA`, `PAUSADA`). También se pueden importar plantillas ya creadas en WhatsApp Manager.
- **Campañas**: cada campaña elige una plantilla aprobada y una audiencia. La audiencia puede salir de:
  - búsqueda por preferencias (el reporte "Por preferencia" existente), con selección manual de socios;
  - envío masivo a todos los socios, o filtrado por sucursal o cumpleaños;
  - una lista manual de socios.
  
  Antes de confirmar se muestra una vista previa con las variables resueltas, la cantidad de destinatarios y los excluidos (sin teléfono, número inválido, dados de baja). El envío se hace en segundo plano por lotes y se puede pausar o cancelar.
- **Mensaje masivo rápido**: atajo para mandar una plantilla a un grupo sin armar una campaña con nombre. Internamente queda registrado como una campaña de tipo `MASIVO`. Los mensajes de texto libre no se ofrecen para envíos masivos porque Meta solo los permite dentro de la ventana de 24 h.
- **Seguimiento de estados**: un webhook de Meta, verificado con firma `X-Hub-Signature-256`, actualiza cada mensaje a enviado, entregado, leído o fallido con su código de error y su categoría de precio. Las respuestas "BAJA" marcan al socio como dado de baja de marketing.
- **Calidad del número**: cada socio tiene un estado de WhatsApp (`DESCONOCIDO`, `VALIDO`, `INVALIDO`, `BAJA`). Un mensaje entregado lo marca válido. Los errores definitivos de número (p. ej. `131026`) lo marcan inválido y lo excluyen de futuras campañas. Errores como `131049` (Meta no entregó un marketing) no invalidan el número. Un admin puede revisar y restablecer el estado.
- **Reportes y monitoreo**: tablero de campañas con embudo enviado → entregado → leído → fallido y tasas; detalle de cada campaña con el estado por destinatario y export CSV; historial de mensajes con filtros; reporte de socios con número inválido o dados de baja; y costo estimado por categoría.
- **Backend** (`panacea-socios-backend`): modelos, migración, servicio cliente de Graph API, endpoints `/whatsapp/*`, webhook público y endpoint de envío por lotes invocado remotamente con service token (sin cron de Vercel).

## Capabilities

### New Capabilities
- `whatsapp-configuracion`: alta, validación y prueba de los parámetros de integración con Meta (WhatsApp Cloud API), con almacenamiento seguro de secretos.
- `plantillas-whatsapp`: ABM de plantillas con variables mapeadas a datos del socio, envío a aprobación de Meta, importación y sincronización de estado.
- `campanias-whatsapp`: armado de audiencias (por preferencias, masivo, manual), vista previa, envío por lotes en segundo plano, pausa y cancelación, y mensajes masivos rápidos.
- `seguimiento-mensajes-whatsapp`: webhook de estados y mensajes entrantes, actualización del estado de cada mensaje, baja por "BAJA" y validación o invalidación del número del socio.
- `reportes-campanias-whatsapp`: tablero y detalle de campañas, historial de mensajes, socios con número inválido o dados de baja, y costos.

### Modified Capabilities
<!-- No hay specs existentes en openspec/specs/. El reporte "Por preferencia" se reutiliza sin cambiar sus requisitos; solo se agrega una acción en la UI para crear una campaña con la selección. -->

## Impact

- **Backend (`panacea-socios-backend`)**:
  - nuevas tablas `whatsapp_configuracion`, `whatsapp_plantillas`, `whatsapp_campanias`, `whatsapp_mensajes` y `whatsapp_eventos`;
  - nuevas columnas en `socios`: `whatsapp_estado`, `whatsapp_estado_motivo`, `whatsapp_estado_actualizado_en`, `whatsapp_telefono_normalizado`;
  - migración `0006`; routers `/whatsapp/configuracion`, `/whatsapp/plantillas`, `/whatsapp/campanias`, `/whatsapp/mensajes`, `/whatsapp/reportes` y `/whatsapp/webhook` (público) y `/whatsapp/lotes/procesar` (service token);
  - nuevas variables de entorno: `WHATSAPP_ENCRYPTION_KEY` (o la derivada de `SECRET_KEY`);
  - dependencia `cryptography` (ya presente de forma transitiva vía `python-jose[cryptography]`); para Graph API se usa `httpx`, que ya está.
- **Frontend (`panacea-socios`)**:
  - nueva sección "WhatsApp" en el menú: Campañas, Plantillas, Mensajes, Reportes y Configuración (las dos últimas solo para admins);
  - acción "Crear campaña con selección" en `PreferenciasPage`;
  - nuevas funciones en `sociosApi.js` y páginas nuevas en `src/pages/whatsapp/`.
- **Externo**: requiere una WABA configurada según la guía (número real verificado, método de pago, token permanente de usuario del sistema, webhook suscripto a `messages`). Los envíos de marketing tienen costo por mensaje en Meta.
- **Datos personales**: los teléfonos de los socios se envían a Meta. Se respeta la baja (opt-out) en todos los envíos de marketing.
