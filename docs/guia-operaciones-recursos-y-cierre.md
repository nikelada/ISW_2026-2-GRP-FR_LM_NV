# Guía: recursos, personal eventual y cierre de eventos

## Objetivo

Esta entrega agrega una primera versión funcional de los cinco requisitos de gestión operativa. Se integra con las solicitudes existentes: una solicitud confirmada se trata como un evento y conserva sus datos, cliente, fecha y horario.

No se reemplaza el inventario comercial existente (`Inventario`). Los equipos, espacios y vehículos se guardan en un modelo separado porque tienen estado operativo y reservas por horario.

## Roles actuales

No se agregaron ni renombraron roles:

| Rol existente | Acceso en esta versión |
| --- | --- |
| `admin` | Gestiona recursos, reservas, devoluciones, personal, tareas, pagos y solicita cierres. |
| `manager` | Consulta eventos operativos y aprueba el cierre final cuando todas las condiciones están cumplidas. |
| `usuario` | Conserva sus permisos existentes; no recibe permisos operativos nuevos en esta entrega. |

La API aplica los permisos en el backend además de ocultar acciones en la interfaz. Esta asignación es un alcance temporal del prototipo: no permite identificar por separado a Operaciones, Logística o Bodega. Tampoco implementa todavía la regla particular de Bodega, porque no existe un rol Bodega y se acordó mantener los roles actuales.

## Qué implementa cada requisito

### 1. Gestión y aprobación del cierre

El administrador registra una respuesta de encuesta como conforme/no conforme y un comentario opcional. Para enviar el evento a Gerencia, el servidor valida que:

- todas las reservas de recursos estén marcadas como devueltas;
- todas las tareas registradas estén completadas;
- todos los pagos registrados estén pagados;
- la encuesta esté registrada como conforme.

Si una condición falla, la API responde con error `409` y enumera los pendientes. Si se cumplen, el cierre pasa a `revision_gerencia`. Un usuario `manager` o `admin` puede aprobarlo; la aprobación vuelve a validar las condiciones dentro de una transacción. Al aprobarse, el cierre queda `aprobado` y el evento ya no admite cambios operativos.

Si se modifica la operación mientras Gerencia aún no aprobó, la solicitud de aprobación vuelve a estado pendiente para que se envíe nuevamente con la información actualizada.

### 2. Gestión de equipos, espacios y vehículos

Se pueden registrar recursos con nombre, tipo, categoría y estado:

- `disponible`
- `en_uso`
- `mantencion`
- `fuera_servicio`

Solo los recursos `disponible` se pueden reservar. Cambiar el estado de un recurso permite volver a incluirlo en la búsqueda cuando se corrige a `disponible`. La gestión no altera la tabla de inventario actual.

### 3. Consulta de disponibilidad

La consulta toma la fecha y horario del evento confirmado seleccionado, además del tipo y una categoría opcional. Revisa las reservas de otros eventos confirmados y el estado del recurso. La respuesta ordena primero los disponibles y después los no disponibles, con un motivo como mantención, fuera de servicio o reserva en conflicto.

### 4. Reserva de recursos para un evento

El recurso queda asociado a la solicitud/evento. Solo se permite reservar si el evento está confirmado, el recurso está disponible y no existe otra reserva del mismo recurso en un horario superpuesto. El guardado usa una transacción serializable; un conflicto concurrente se informa como conflicto y no se confirma la reserva.

La regla horaria considera que los intervalos se superponen cuando la hora de inicio de una reserva es anterior al fin de la otra y su hora de fin es posterior al inicio de la otra.

### 5. Personal eventual y contactos

Se puede asignar una persona ya guardada como contacto o crear una persona nueva con nombre y datos de contacto opcionales. La asignación queda ligada al evento. Al aprobar el cierre, si la encuesta está conforme, el personal asignado queda marcado para reutilizarse como contacto en futuros eventos.

## Cambios de código

| Archivo | Propósito |
| --- | --- |
| `backend/prisma/schema.prisma` | Añade recursos, reservas, personal eventual, asignaciones, tareas, pagos y cierre. Agrega sus relaciones a `Solicitud` y a `User` para registrar quién aprobó. |
| `backend/prisma/migrations/20261109000000_operaciones_eventos/migration.sql` | Crea las tablas, enumeraciones, índices y relaciones nuevos. No modifica ni elimina tablas existentes. |
| `backend/src/middlewares/rol.middleware.js` | Añade el grupo `ROLES_ADMIN` sin cambiar los roles existentes. |
| `backend/src/middlewares/operaciones.middleware.js` | Valida entradas de recursos, disponibilidad, personal, tareas, pagos y encuesta. |
| `backend/src/services/operaciones.service.js` | Implementa reglas de negocio, búsquedas, control de conflictos, seguimiento de cierre y reutilización de contactos. |
| `backend/src/controllers/operaciones.controller.js` | Conecta las rutas HTTP con los servicios y el manejo de errores ya existente. |
| `backend/src/routes/operaciones.routes.js` | Declara las rutas y aplica autenticación/autorización del servidor. |
| `backend/src/routes/index.routes.js` | Registra el grupo de rutas `/api/operaciones`. |
| `frontend/src/services/operacionesService.js` | Encapsula las llamadas del frontend a la nueva API. |
| `frontend/src/pages/OperacionesPage.jsx` | Interfaz para recursos, disponibilidad, reservas, devoluciones, personal, tareas, pagos y aprobación de cierre. |
| `frontend/src/App.jsx` | Agrega la sección Operaciones al menú para `manager` y `admin`. |

El archivo de interfaz `frontend/src/pages/InventarioPage.jsx` tenía un cambio local pendiente antes de esta implementación. Se dejó intacto.

## Rutas nuevas

Todas requieren autenticación. Las rutas administrativas además requieren el rol `admin`; la consulta y aprobación del cierre aceptan `manager` y `admin`.

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/operaciones/eventos` | Lista eventos confirmados para el selector operativo. |
| `GET` | `/api/operaciones/eventos/:id` | Consulta el detalle operativo y las condiciones de cierre. |
| `GET` | `/api/operaciones/recursos` | Lista recursos existentes. |
| `POST` / `PUT` | `/api/operaciones/recursos` / `/api/operaciones/recursos/:id` | Crea o actualiza un recurso y su estado. |
| `GET` | `/api/operaciones/recursos/disponibilidad` | Busca por fecha, horario, tipo y categoría opcional. |
| `POST` | `/api/operaciones/eventos/:id/reservas` | Reserva un recurso para un evento confirmado. |
| `PATCH` | `/api/operaciones/reservas/:id/devolucion` | Registra la devolución de un recurso. |
| `GET` | `/api/operaciones/personal/contactos` | Lista personas guardadas como contactos. |
| `POST` / `DELETE` | `/api/operaciones/eventos/:id/personal` / `/api/operaciones/asignaciones-personal/:id` | Asigna o quita personal eventual. |
| `POST` / `PATCH` | `/api/operaciones/eventos/:id/tareas` / `/api/operaciones/tareas/:id` | Crea o cambia el estado de una tarea. |
| `POST` / `PATCH` | `/api/operaciones/eventos/:id/pagos` / `/api/operaciones/pagos/:id` | Registra o cambia el estado de un pago. |
| `POST` | `/api/operaciones/eventos/:id/cierre` | Registra encuesta y solicita revisión de Gerencia si no hay pendientes. |
| `POST` | `/api/operaciones/eventos/:id/aprobar-cierre` | Aprueba el cierre final y guarda al personal como contacto si corresponde. |

## Cómo probar el flujo manualmente

1. Usar una base de datos local o de desarrollo del equipo. No hacer pruebas contra una base compartida sin coordinarlo.
2. Aplicar las migraciones y generar el cliente Prisma.
3. Iniciar backend y frontend con los comandos descritos en el `README.md`.
4. Iniciar sesión como `admin`; crear un equipo disponible y, si se desea, crear otro recurso en mantención.
5. Confirmar previamente una solicitud de evento y seleccionarla en Operaciones.
6. Consultar el equipo para el horario del evento y reservarlo. El recurso en mantención debe aparecer como no disponible.
7. Crear otra solicitud confirmada para el mismo horario y verificar que el equipo indique conflicto y no se pueda reservar. Un horario distinto no debería presentar conflicto.
8. Marcar devuelto el recurso; registrar una tarea y un pago, y dejarlos pendientes.
9. Intentar solicitar el cierre. La respuesta debe mostrar los pendientes; completar tarea/pago y registrar encuesta conforme.
10. Solicitar nuevamente el cierre, iniciar sesión como `manager` y aprobar. El evento debe quedar aprobado y el personal asignado debe aparecer luego entre los contactos reutilizables.

## Migración y trabajo en grupo

La migración se agregó como archivo nuevo y no se ejecutó contra ninguna base de datos. El script `dev` del backend aplica automáticamente migraciones pendientes, por lo que su ejecución altera la base configurada en `backend/.env`.

Antes de ejecutar `npm run dev`, `npm run migrate` o cualquier despliegue en un entorno compartido:

1. revisar la migración nueva en conjunto;
2. confirmar qué base de datos apunta `DATABASE_URL`;
3. respaldar o usar la base local del equipo;
4. coordinar que el grupo incorpore el mismo archivo de migración antes de usar los modelos nuevos.

## Alcance no cubierto todavía

- Los roles existentes no permiten distinguir Operaciones, Logística y Bodega. La regla de que Bodega vea solo equipos y vehículos requeriría una decisión de permisos sin cambiar los nombres de roles, o un mecanismo adicional de áreas/permisos.
- La evaluación del cliente se representa como una respuesta booleana conforme/no conforme, no como una encuesta con puntaje y preguntas.
- Las tareas y pagos se registran para controlar pendientes; no reemplazan un módulo contable, un sistema externo de pagos ni una planificación avanzada de tareas.
- El cierre aprobado se guarda en `CierreEvento`; no cambia el enum `EstadoSolicitud` existente para evitar mezclar el estado comercial de la solicitud con el ciclo operativo del cierre.
