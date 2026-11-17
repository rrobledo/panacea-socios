## ADDED Requirements

### Requirement: Tablero de campañas
`GET /whatsapp/reportes/resumen?desde&hasta` SHALL devolver, para el período, estos datos:
- totales de mensajes por estado (`PENDIENTE`, `ENVIADO`, `ENTREGADO`, `LEIDO`, `FALLIDO`, `CANCELADO`);
- tasas: entrega = (entregados + leídos) / enviados efectivos; lectura = leídos / entregados; falla = fallidos / intentados;
- cantidad de campañas por estado;
- serie diaria de enviados, entregados, leídos y fallidos;
- las 5 campañas con mejor tasa de lectura;
- los 5 códigos de error más frecuentes.

Requiere un usuario autenticado. El frontend MUST mostrarlo con tarjetas de indicadores, el embudo enviado → entregado → leído y un gráfico de serie diaria (Recharts).

#### Scenario: Embudo del mes
- **WHEN** en el mes se intentaron 1000 mensajes: 950 enviados, 900 entregados, 600 leídos y 50 fallidos
- **THEN** el tablero muestra entrega 94,7 %, lectura 66,7 % y falla 5 %

### Requirement: Detalle de una campaña
`GET /whatsapp/campanias/{id}` SHALL devolver:
- los datos de la campaña;
- la plantilla con su texto;
- la definición de la audiencia;
- los contadores por estado y las tasas;
- los excluidos por motivo al momento del envío;
- las fechas de inicio y fin;
- quién la creó.

`GET /whatsapp/campanias/{id}/mensajes` SHALL listar los destinatarios con su nombre, teléfono, estado, fechas de cada hito, error y respuesta (si respondió). Admite filtro por estado y paginación (`skip`, `limit` hasta 500). El frontend MUST permitir exportar la lista a CSV.

#### Scenario: Ver los fallidos de una campaña
- **WHEN** se filtra el detalle por estado `FALLIDO`
- **THEN** aparecen solo los destinatarios fallidos, con código y descripción del error

### Requirement: Historial de mensajes
`GET /whatsapp/mensajes` SHALL listar todos los mensajes enviados (de campañas, masivos y pruebas), con filtros por socio, campaña, estado, código de error y rango de fechas, ordenados por fecha descendente y paginados. Desde la ficha del socio (`SocioResumen`) MUST poder verse su historial de WhatsApp y su `whatsapp_estado`.

#### Scenario: Historial de un socio
- **WHEN** se consulta `GET /whatsapp/mensajes?socio_id=42`
- **THEN** se listan los mensajes enviados a ese socio con su campaña y estado

### Requirement: Socios con número inválido o dados de baja
`GET /whatsapp/reportes/socios-no-contactables` SHALL listar los socios con `whatsapp_estado` en `INVALIDO` o `BAJA`, o sin teléfono normalizable, con su motivo, fecha y último error. Admite filtro por motivo y sucursal, y paginación. El frontend MUST permitir exportar el listado a CSV, ir a la ficha del socio y restablecer su estado.

#### Scenario: Depurar números inválidos
- **WHEN** se filtra por motivo `INVALIDO`
- **THEN** aparecen los socios invalidados, con el código de error que los invalidó

### Requirement: Costos estimados
El resumen SHALL incluir la cantidad de mensajes facturables por categoría de precio (`marketing`, `utility`, `service`), según el `pricing` del webhook, y el costo estimado según las tarifas por categoría cargadas en la configuración. Si no hay tarifas cargadas, MUST mostrar solo las cantidades.

#### Scenario: Costo del mes
- **WHEN** hubo 800 mensajes facturables de marketing y la tarifa es 0,0618 USD
- **THEN** el resumen muestra 49,44 USD estimados para marketing

### Requirement: Avance en vivo de campañas en curso
La pantalla de detalle de una campaña `EN_CURSO` SHALL refrescar los contadores cada 10 segundos mientras esté abierta. También MUST ofrecer el botón "Procesar siguiente lote", que llama a `POST /whatsapp/campanias/{id}/procesar`, para no depender solo de la invocación remota.

#### Scenario: Seguimiento en vivo
- **WHEN** un admin tiene abierto el detalle de una campaña en curso
- **THEN** ve cómo avanzan los contadores sin recargar la página
