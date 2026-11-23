# Informe de Cambios – Sistema DAEM

**Proyecto:** DAEM (Gestión de Actividades Extraescolares)
**Repositorio:** https://github.com/pppaloo/DAEMPROYECTO.git
**Rama:** main
**Fecha del informe:** 23 de noviembre de 2026

---

## 1. Requerimientos originales (del checkpoint)

| # | Requerimiento | Estado |
|---|---|---|
| 1 | Las solicitudes del coordinador se ven en ambos perfiles; solo el admin aprueba/rechaza inscripciones. | ✅ Implementado |
| 2 | Tabs Pendientes/Historial arriba, reemplazando el listado. | ✅ Implementado |
| 3 | Todos los módulos que listen datos deben paginarse de 12 en 12; **Feriados muestra hasta 3 por página**. | ✅ Implementado |
| 4 | "Mis establecimientos" solo muestra lo agregado con "Agregar" desde MINEDUC. | ✅ Implementado |
| 5 | RBD: solo números, máximo 6. | ✅ Implementado |
| 6 | El usuario escribe y espera respuestas en español. | ✅ Implementado |
| 7 | En Resumen DAEM, las burbujas de totales deben ser clickeables y llevar al módulo correspondiente. | ✅ Implementado |
| 8 | El módulo "Directorio MINEDUC" renombrado a "Establecimientos". | ✅ Implementado |
| 9 | Mensajes de notificación centrados y más grandes, borde verde para éxito, rojo para error. | ✅ Implementado |

---

## 2. Requerimientos adicionales implementados

| # | Requerimiento | Estado |
|---|---|---|
| 10 | Login del coordinador por RBD (en lugar de RUT). | ✅ Implementado |
| 11 | Formato automático de RUT en el login (puntos y guión: 22.113.000-6). | ✅ Implementado |
| 12 | Solicitudes por lote (varios estudiantes en una sola solicitud, aprobación/rechazo del lote completo). | ✅ Implementado |
| 13 | Código único de lote por solicitud (campo `codigo` en BD, aparte del `id`). | ✅ Implementado |
| 14 | Tabla `solicitud_alumnos` para desglosar estudiantes por solicitud. | ✅ Implementado |
| 15 | Botón "Ver estudiantes" / modal con desglose de alumnos del lote. | ✅ Implementado |
| 16 | Edición de participantes (formulario con datos del estudiante) con notificación al admin. | ✅ Implementado |
| 17 | Endpoint `PUT /api/alumnos/:id` para actualizar alumno (admin/coordinador). | ✅ Implementado |
| 18 | Toasts (mensajes) centrados, más grandes (17px), con borde verde/rojo. | ✅ Implementado |
| 19 | Pantalla de carga (overlay con spinner) en operaciones de escritura. | ✅ Implementado |
| 20 | Cierre automático de sesión tras 10 minutos de inactividad. | ✅ Implementado |
| 21 | Alerta de inactividad (5 minutos). | ✅ Implementado |
| 22 | Recordatorios por correo (1 día y 1 hora antes de encuentros, partidos, apertura/cierre de inscripciones). | ✅ Implementado |
| 23 | Scheduler de recordatorios (cada 60 segundos). | ✅ Implementado |
| 24 | Paginación arriba, debajo del buscador, en todos los módulos. | ✅ Implementado |
| 25 | Coordinador no tiene acceso al módulo "Establecimientos". | ✅ Implementado |
| 26 | Torneos: 4 por página. | ✅ Implementado |
| 27 | Actividades: 4 por página. | ✅ Implementado |
| 28 | Filtro por área en creación de torneo. | ✅ Implementado |
| 29 | Filtro por área en postulaciones de torneos. | ✅ Implementado |
| 30 | Cartelera muestra solo actividades con estudiantes de la nómina. | ✅ Implementado |
| 31 | Cartelera: al hacer clic en actividad, modal con estudiantes y botón "Editar". | ✅ Implementado |
| 32 | Mi nómina muestra estudiantes solicitados por actividad (con desglose). | ✅ Implementado |
| 33 | Mi nómina muestra nombres de estudiantes en inscripciones. | ✅ Implementado |
| 34 | Validación de RBD contra listado MINEDUC al crear establecimiento. | ✅ Implementado |
| 35 | Validación de edad mínima (3 años) en formularios de estudiantes y torneos. | ✅ Implementado |
| 36 | Claves de hasta 30 caracteres (antes 10). | ✅ Implementado |
| 37 | Botón "ojo" para mostrar/ocultar clave en login. | ✅ Implementado |
| 38 | Directorio MINEDUC: solo establecimientos de Los Ángeles. | ✅ Implementado |
| 39 | Agenda: días con torneo en color diferente (dorado). | ✅ Implementado |
| 40 | Trazabilidad histórica: tabla legible (Año, Beneficiarios, Inscripciones) en lugar de JSON. | ✅ Implementado |
| 41 | Renombrar "Lector" a "Director" en la UI. | ✅ Implementado |
| 42 | Ocultar mensaje de "Usuarios de ejemplo" en el login. | ✅ Implementado |
| 43 | Coordinadores y directores con establecimientos asignados (BD poblada). | ✅ Implementado |
| 44 | Asignación de establecimientos a directores (lectores) para pruebas. | ✅ Implementado |

---

## 3. Módulos del sistema y sus funcionalidades

### Admin DAEM
- **Resumen**: burbujas clickeables a Establecimientos, Actividades, Torneos, Solicitudes.
- **Establecimientos**: directorio MINEDUC (128 de Los Ángeles) + mis establecimientos. Agregar desde MINEDUC o manual (RBD validado). Editar/eliminar.
- **Usuarios**: CRUD de usuarios (admin, coordinador, director). Edición con formulario. Filtros por rol y establecimiento.
- **Actividades**: CRUD con categorías/subcategorías, secciones, áreas, recintos, límites, ventanas de inscripción. Paginación 4 por página.
- **Torneos y Sorteo**: crear torneo (formato amistoso/competitivo), programar (fechas, llaves), suspender/reactivar, eliminar. Paginación 4 por página.
- **Inscripciones**: aprobar/rechazar inscripciones de establecimientos. Paginación 12 por página.
- **Solicitudes**: aprobar/rechazar solicitudes de estudiantes (por lote). Tabs Pendientes/Historial. Desglose de estudiantes con botón "Ver estudiantes" (modal).
- **Ranking de Cumplimiento**: valoraciones por establecimiento/actividad.
- **Reportes y Estadísticas**: participación, beneficiarios, trazabilidad histórica (tabla por año).
- **Feriados**: paginación 3 por página.
- **Agenda**: calendario mensual con días con torneo en color diferente.
- **Notificaciones**: historial y gestión.

### Coordinador
- **Resumen**: estudiantes inscritos, accesos directos.
- **Lectores**: gestión de directores de su establecimiento.
- **Postulaciones**: cartelera de actividades (filtro por área), inscripción de establecimiento, mi nómina con estudiantes.
- **Postular a Torneos**: torneos disponibles (filtro por área y formato), postulación por lote desde nómina, registro de nuevo estudiante (solicitud).
- **Mis Solicitudes**: crear solicitudes por lote, tabs Pendientes/Historial, retractar.
- **Mi nómina**: estudiantes solicitados por actividad, con desglose y edición.
- **Feriados**: consulta.

### Director (Lector)
- **Resumen**: solo lectura.
- **Estudiantes**: consulta de estudiantes de su establecimiento.
- **Agenda**: consulta de partidos.
- **Feriados**: consulta.

---

## 4. Cambios en base de datos

### Nuevas tablas
- `solicitud_alumnos` (id, solicitud, rut, nombre, genero, fechaNacimiento, apoderado, email, telefono) — soporte de lote.

### Nuevas columnas
- `solicitudes.codigo` (TEXT UNIQUE) — código de lote único.

### Migraciones
- Creación automática de tabla `solicitud_alumnos` si no existe.
- Migración de alumnos legacy (una solicitud = un alumno) a la tabla de lote.
- Asignación de código a solicitudes existentes.

---

## 5. Cambios en backend (Node.js/Express)

### Servicios
- **SolicitudService**: `crearSolicitudEstudiante` acepta `datos.alumnos` (array) además de `datos.alumno`. `#agregarEstudiante` itera y agrega todos los alumnos del lote.
- **AuthService**: login por RBD para coordinadores (busca establecimiento por código, luego usuario coordinador).
- **RecordatorioService**: nuevo servicio que envía correos 1 día y 1 hora antes de encuentros, partidos, apertura/cierre de inscripciones. Scheduler cada 60 segundos.
- **ReporteService**: trazabilidad histórica mejorada (tabla por año con beneficiarios e inscripciones).

### Repositorios
- **SolicitudRepository**: `crear` inserta código y alumnos en lote; `obtenerTodos`/`obtenerPorId` cargan alumnos.
- **UsuarioRepository**: `obtenerPorRut` normaliza RUT (quita puntos, asegura guión).
- **AlumnoRepository**: `actualizar` soporta edición; `buscarPorRutEnActividad` normaliza RUT.
- **EstablecimientoRepository**: `obtenerPorCodigo` para login por RBD.

### Controladores y rutas
- **AlumnoController**: nuevo método `actualizar` (PUT /api/alumnos/:id).
- **alumnoRoutes**: PUT /:id con autorización admin/coordinador.
- **solicitudRoutes**: DELETE /:id permite coordinador (retractar).

---

## 6. Cambios en frontend (HTML/CSS/JS)

### JavaScript (app.js)
- `formatearRutInput`: formatea RUT con puntos y guión mientras se escribe; RBD (1-6 dígitos) no se formatea.
- `mostrarMensaje`: toasts centrados, más grandes (17px), con borde verde/rojo.
- `mostrarExito`: delega en `mostrarMensaje(msg, "ok")`.
- `confirmarMensaje`: modal de confirmación (sin "localhost").
- `conectarPaginacion`: mueve la barra de paginación arriba, debajo del buscador.
- `paginarUI`: acepta tamaño de página opcional (Feriados usa 3, resto 12, torneos/actividades usan 4).
- Pantalla de carga (overlay con spinner) en operaciones de escritura.
- Cierre automático de sesión tras 10 min de inactividad.
- Modal para ver estudiantes de solicitud.
- Modal para editar participante con formulario.
- Filtro por área en cartelera y creación de torneo.
- Login por RBD para coordinadores.

### CSS (estilos.css)
- `#tostadas`: overlay centrado con fondo semitransparente (solo mientras hay toast).
- `.tostada`: tarjeta con borde verde (éxito) / rojo (error), 17px, texto centrado.
- `.stat-clicable`: burbujas del resumen clickeables.
- `.cal-celda.con-evento`: días con torneo en color dorado.
- Paginación arriba en todos los módulos.

### HTML (index.html)
- Login: label "RUT o RBD", placeholder actualizado, botón "ojo" para mostrar clave.
- Usuarios de ejemplo ocultos.
- Versiones de app.js y estilos.css actualizadas (v=90, v=69).

---

## 7. Cambios en infraestructura

### Render (render.yaml)
- Configuración para despliegue en Render (web service, plan gratuito).
- Variables de entorno documentadas.
- Sin disco persistente en plan gratuito (BD efímera); opción de disco en plan Starter.

### Base de datos
- `DB_PATH` soportado para disco persistente en Render.
- Directorio `data/` creado automáticamente si no existe.

---

## 8. Credenciales de prueba

| Rol | Usuario | Clave | Forma de ingresar |
|---|---|---|---|
| Admin | `11111111-1` | `admin123` | RUT |
| Coordinador 1 | RBD `4160` | `coord123` | RBD |
| Coordinador 2 | RBD `4166` | `coord123` | RBD |
| Director 1 | `77777777-7` | `director123` | RUT |
| Director 2 | `88888888-8` | `director123` | RUT |

---

## 9. Archivos principales modificados

| Archivo | Cambios |
|---|---|
| `public/js/app.js` | Lógica de UI, paginación, toasts, formateo RUT, solicitudes por lote, edición de participantes, filtros, modales. |
| `public/css/estilos.css` | Toasts, paginación, calendario, tarjetas. |
| `public/index.html` | Versiones, login (RUT o RBD, ojo, hint oculto). |
| `services/AuthService.js` | Login por RBD para coordinadores. |
| `services/SolicitudService.js` | Solicitudes por lote, edición. |
| `services/RecordatorioService.js` | Nuevo: recordatorios por correo. |
| `repositories/SolicitudRepository.js` | Código único, tabla solicitud_alumnos. |
| `repositories/UsuarioRepository.js` | Normalización de RUT. |
| `repositories/AlumnoRepository.js` | Actualizar, normalización de RUT. |
| `db/esquema.js` | Tabla solicitud_alumnos, columna codigo. |
| `db/conexion.js` | DB_PATH, creación de directorio. |
| `controllers/AlumnoController.js` | Método actualizar. |
| `routes/alumnoRoutes.js` | PUT /:id para admin/coordinador. |
| `routes/solicitudRoutes.js` | DELETE permite coordinador. |
| `seed/seed.js` | Defaults para admin. |
| `server.js` | Scheduler de recordatorios. |
| `render.yaml` | Configuración de despliegue Render. |

---

## 10. Notas finales

- La base de datos está poblada con datos de prueba (128 establecimientos, 5 actividades, 10 estudiantes, 5 inscripciones, 5 solicitudes, 5 torneos).
- El servidor corre en `http://localhost:3000`.
- El proyecto está desplegado en GitHub: `https://github.com/pppaloo/DAEMPROYECTO.git`.
- Para despliegue en Render, seguir las instrucciones del Blueprint (plan gratuito sin persistencia, o Starter con disco).

---

*Informe generado automáticamente a partir del historial de cambios de la sesión.*
