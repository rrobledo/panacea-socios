## ADDED Requirements

### Requirement: Crear y editar plantillas de campaña
`POST /whatsapp/plantillas` y `PUT /whatsapp/plantillas/{id}` SHALL guardar una plantilla con:
- nombre en Meta: minúsculas, números y `_`, único por idioma;
- nombre visible;
- categoría (`MARKETING`, `UTILITY`);
- idioma;
- encabezado de texto opcional, de hasta 60 caracteres;
- cuerpo de hasta 1024 caracteres con variables `{{1}}…{{n}}`;
- pie opcional, de hasta 60 caracteres;
- botones opcionales: respuesta rápida o URL, hasta 3.

Una plantilla nueva MUST quedar en estado `BORRADOR`. Solo las plantillas en `BORRADOR` o `RECHAZADA` MUST poder editarse. Una plantilla ya aprobada se modifica creando una copia. Requiere un usuario admin.

#### Scenario: Nombre inválido
- **WHEN** se crea una plantilla con nombre `Promo Navidad`
- **THEN** responde 422 indicando que el nombre solo admite minúsculas, números y guion bajo

#### Scenario: Editar una plantilla aprobada
- **WHEN** se intenta editar una plantilla `APROBADA`
- **THEN** responde 409 `PLANTILLA_NO_EDITABLE`

### Requirement: Variables mapeadas a datos del socio
Cada variable `{{n}}` del cuerpo (y del encabezado, si tiene) SHALL tener una definición que indique su origen:
- un campo del socio, de un catálogo cerrado: `nombre_completo`, `primer_nombre`, `saldo_puntos`, `sucursal_principal`, `fecha_nacimiento`, `preferencia_principal`, `dni`;
- o un `texto_fijo`.

Cada variable MUST incluir un valor de ejemplo, que Meta exige, y un valor por defecto para cuando el dato del socio está vacío. Las variables MUST ser consecutivas desde `{{1}}`, MUST NOT estar al inicio ni al final del cuerpo y MUST NOT estar pegadas entre sí (reglas de Meta). `GET /whatsapp/plantillas/campos` SHALL devolver el catálogo de campos disponibles con su descripción.

#### Scenario: Variable sin definir
- **WHEN** el cuerpo usa `{{1}}` y `{{2}}` pero solo se definió `{{1}}`
- **THEN** responde 422 indicando que falta definir `{{2}}`

#### Scenario: Variable al final del cuerpo
- **WHEN** el cuerpo termina en `{{1}}`
- **THEN** responde 422 con la regla de Meta incumplida

#### Scenario: Dato vacío usa el valor por defecto
- **WHEN** la variable `{{1}}` es `primer_nombre` con valor por defecto "socio" y el socio no tiene nombre cargado
- **THEN** el mensaje se arma con "socio"

### Requirement: Vista previa de la plantilla para un socio
`POST /whatsapp/plantillas/{id}/vista-previa` con `socio_id` SHALL devolver el texto final con las variables resueltas para ese socio. Sin `socio_id`, MUST usar los valores de ejemplo.

#### Scenario: Vista previa con datos reales
- **WHEN** se pide la vista previa de "Hola {{1}}, tenés {{2}} puntos" para un socio "Ana Pérez" con 350 puntos
- **THEN** devuelve "Hola Ana, tenés 350 puntos"

### Requirement: Enviar la plantilla a aprobación de Meta
`POST /whatsapp/plantillas/{id}/enviar-aprobacion` SHALL crear la plantilla en la WABA con la API `message_templates`, con los ejemplos de las variables, guardar el `meta_template_id` y pasar el estado a `PENDIENTE`. Si Meta la rechaza en el momento, MUST guardar el motivo y dejarla en `RECHAZADA`.

#### Scenario: Envío aceptado
- **WHEN** Meta acepta la creación
- **THEN** la plantilla queda `PENDIENTE` con su `meta_template_id`

#### Scenario: Nombre duplicado en Meta
- **WHEN** Meta responde que ya existe una plantilla con ese nombre e idioma
- **THEN** responde 409 con el mensaje de Meta y la plantilla sigue en `BORRADOR`

### Requirement: Sincronizar estado e importar plantillas desde Meta
`POST /whatsapp/plantillas/sincronizar` SHALL leer las plantillas de la WABA y actualizar el estado de las locales: `APPROVED` → `APROBADA`, `PENDING` → `PENDIENTE`, `REJECTED` → `RECHAZADA` (con motivo), `PAUSED` → `PAUSADA`, `DISABLED` → `DESACTIVADA`. Las plantillas que existen en Meta pero no localmente MUST importarse con sus variables sin mapear: cada variable queda como `texto_fijo` con su ejemplo hasta que alguien la mapee. El webhook `message_template_status_update` MUST actualizar el estado de la misma forma.

#### Scenario: Plantilla aprobada
- **WHEN** Meta informa `APPROVED` para una plantilla `PENDIENTE`
- **THEN** la plantilla pasa a `APROBADA` y puede usarse en campañas

#### Scenario: Importar plantilla existente
- **WHEN** la WABA tiene `promo_mensual` aprobada y no existe localmente
- **THEN** se crea localmente como `APROBADA`, con origen `IMPORTADA`

### Requirement: Listar y archivar plantillas
`GET /whatsapp/plantillas` SHALL listar las plantillas con filtros por estado y categoría, y con la cantidad de campañas que usó cada una. `DELETE /whatsapp/plantillas/{id}` MUST archivar la plantilla (baja lógica) si tiene campañas asociadas, y MUST eliminarla si está en `BORRADOR` sin uso.

#### Scenario: Archivar plantilla usada
- **WHEN** se borra una plantilla usada en 2 campañas
- **THEN** queda archivada, deja de ofrecerse para nuevas campañas y las campañas existentes la siguen mostrando
