# Informe de Desarrollo de Software – Sistema DAEM

**Proyecto:** DAEM (Gestión de Actividades Extraescolares)
**Repositorio:** https://github.com/pppaloo/DAEMPROYECTO.git
**Rama:** main
**Fecha:** 23 de noviembre de 2026
**Autor:** Equipo de desarrollo DAEM

---

## 1. Introducción

El sistema **DAEM** (Departamento de Administración de Educación Municipal) es una plataforma web para la gestión de actividades extraescolares (deportivas y artístico-culturales) a nivel comunal. Permite a los establecimientos educacionales inscribirse en actividades, postular estudiantes a torneos, y al DAEM administrar todo el proceso de manera centralizada.

El sistema fue desarrollado con **Node.js**, **Express**, **SQLite** y un frontend SPA en **JavaScript vanilla**, siguiendo principios de Programación Orientada a Objetos (POO) y arquitectura en capas.

---

## 2. Requisitos

### 2.1 Requisitos funcionales (RF)

| ID | Requisito | Prioridad (MoSCoW) | Módulo |
|---|---|---|---|
| RF-01 | El admin puede crear, editar y eliminar actividades (nombre, área, categorías, sección, recintos, límites). | Must | Admin → Actividades |
| RF-02 | El admin puede crear torneos (amistoso/competitivo) asociados a una actividad y categoría. | Must | Admin → Torneos |
| RF-03 | El admin puede programar torneos: fechas, llaves, partidos, horarios, lugares. | Must | Admin → Torneos |
| RF-04 | El admin puede suspender/reactivar/eliminar torneos. | Should | Admin → Torneos |
| RF-05 | El coordinador puede inscribir su establecimiento en actividades (queda en proceso). | Must | Coordinador → Postulaciones |
| RF-06 | El admin puede aprobar/rechazar inscripciones de establecimientos. | Must | Admin → Inscripciones |
| RF-07 | El coordinador puede solicitar inscripción de estudiantes por lote (varios a la vez). | Must | Coordinador → Solicitudes |
| RF-08 | El admin puede aprobar/rechazar solicitudes de estudiantes (por lote completo). | Must | Admin → Solicitudes |
| RF-09 | Al aprobar, el estudiante se agrega a la nómina de la actividad. | Must | Backend |
| RF-10 | El coordinador puede postular estudiantes de su nómina a torneos (por lote). | Must | Coordinador → Postular Torneos |
| RF-11 | El admin puede ver y gestionar la agenda de partidos (calendario mensual). | Must | Admin → Agenda |
| RF-12 | El admin puede ver reportes: participación, beneficiarios, trazabilidad histórica. | Should | Admin → Reportes |
| RF-13 | El admin puede gestionar usuarios (CRUD, roles, establecimientos). | Must | Admin → Usuarios |
| RF-14 | El admin puede gestionar establecimientos (directorio MINEDUC + propios). | Must | Admin → Establecimientos |
| RF-15 | El coordinador puede gestionar lectores (directores) de su establecimiento. | Should | Coordinador → Lectores |
| RF-16 | Recuperación de clave por correo electrónico. | Should | Login |
| RF-17 | Recordatorios automáticos por correo (1 día y 1 hora antes). | Could | Backend (scheduler) |
| RF-18 | Paginación en todos los listados (12 por página; Feriados 3; Torneos/Actividades 4). | Must | Todos los módulos |
| RF-19 | Filtro por área y formato en postulaciones de torneos. | Should | Coordinador → Postular Torneos |
| RF-20 | Solo actividades con estudiantes en nómina se muestran en cartelera. | Should | Coordinador → Postulaciones |

### 2.2 Requisitos no funcionales (RNF)

| ID | Requisito | Categoría |
|---|---|---|
| RNF-01 | La aplicación debe responder en menos de 2 segundos para operaciones CRUD. | Rendimiento |
| RNF-02 | La interfaz debe ser responsive (adaptable a móvil, tablet y escritorio). | Usabilidad |
| RNF-03 | Los mensajes de error/éxito deben mostrarse como tarjetas centradas con colores (verde/rojo). | Usabilidad |
| RNF-04 | La autenticación debe usar JWT con expiración de 12 horas. | Seguridad |
| RNF-05 | Las contraseñas deben almacenarse con hash bcrypt. | Seguridad |
| RNF-06 | El sistema debe validar RUT chileno (dígito verificador). | Validación |
| RNF-07 | El sistema debe proteger contra inyección SQL (consultas parametrizadas). | Seguridad |
| RNF-08 | La sesión debe cerrarse tras 10 minutos de inactividad. | Seguridad |
| RNF-09 | El sistema debe funcionar sin conexión a internet (excepto directorio MINEDUC). | Disponibilidad |
| RNF-10 | El código debe estar documentado con JSDoc y comentarios. | Mantenibilidad |

### 2.3 Trazabilidad requisito → módulo

| Requisito | Módulo frontend | Endpoint backend |
|---|---|---|
| RF-01 | panelAdminActividades | POST/PUT/DELETE /api/actividades |
| RF-02, RF-03 | panelAdminTorneos | POST/PUT /api/torneos |
| RF-05 | panelCoordInscribir | POST /api/inscripciones |
| RF-06 | panelAdminInscripciones | PUT /api/inscripciones/:id/estado |
| RF-07, RF-08 | panelCoordSolicitudes, panelAdminSolicitudes | POST /api/solicitudes/estudiante, PUT /api/solicitudes/:id/estado |
| RF-10 | panelCoordTorneos | POST /api/alumnos/:id (postular) |
| RF-11 | panelAdminAgenda | GET /api/torneos/agenda |
| RF-12 | panelAdminReportes | GET /api/reportes/* |
| RF-13 | panelAdminUsuarios | POST/PUT/DELETE /api/usuarios |
| RF-14 | panelAdminEstablecimientos | GET /api/externo/directorio, POST/PUT/DELETE /api/establecimientos |
| RF-16 | vistaLoginForma | POST /api/auth/recuperar, /api/auth/restablecer |
| RF-18 | Todos los paneles | paginarUI, conectarPaginacion |

---

## 3. Análisis y diseño

### 3.1 Arquitectura del sistema

El sistema sigue una **arquitectura en capas** (3 capas):

```
┌─────────────────────────────────────────────┐
│           CAPA DE PRESENTACIÓN               │
│  (HTML + CSS + JavaScript SPA)              │
│  public/index.html, public/js/app.js        │
│  public/css/estilos.css                     │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST (JSON)
┌────────────────────┴────────────────────────┐
│           CAPA DE NEGOCIO                   │
│  (Servicios + Controladores + Middleware)   │
│  services/*.js, controllers/*.js            │
│  middleware/auth.js, validateRol.js         │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────┴────────────────────────┐
│           CAPA DE DATOS                     │
│  (Repositorios + Base de datos SQLite)      │
│  repositories/*.js, db/conexion.js          │
│  db/esquema.js, data/daem.db               │
└─────────────────────────────────────────────┘
```

### 3.2 Patrón de diseño

- **MVC (Model-View-Controller)**: los controladores reciben las peticiones HTTP, los servicios contienen la lógica de negocio, y los repositorios acceden a la BD.
- **Repository Pattern**: cada entidad tiene su repositorio que encapsula las consultas SQL.
- **Domain-Driven Design (DDD)**: las clases de dominio (`Usuario`, `Actividad`, `Torneo`, `Alumno`, `Persona`, etc.) encapsulan validaciones y reglas de negocio.

### 3.3 Modelo de base de datos (entidades principales)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  usuarios    │     │ establecim.  │     │ actividades  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ rut (UNIQUE) │     │ codigo (UNIQ)│     │ nombre       │
│ nombre       │     │ nombre       │     │ area         │
│ email        │     │ dependencia  │     │ seccion (FK) │
│ rol          │     │ direccion    │     │ categorias   │
│ claveHash    │     │ contacto     │     │ divisiones   │
│ establecim.  │────►│ createdAt    │     │ anio         │
│ activo       │     │ updatedAt    │     │ estado       │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │                                         │
┌──────┴───────┐     ┌──────────────┐     ┌──────┴───────┐
│ notificaciones│     │ inscripciones│     │  encuentros  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ destinatario │     │ establecim.  │────►│ actividad    │
│ tipo         │     │ actividad    │     │ fecha        │
│ torneo       │     │ division     │     │ hora         │
│ mensaje      │     │ estado       │     │ lugar        │
│ descartada   │     │ torneo       │     └──────────────┘
└──────────────┘     │ rutCoordin.  │
                     └──────┬───────┘
                            │
┌──────────────┐     ┌──────┴───────┐     ┌──────────────┐
│  torneos     │     │  alumnos     │     │  solicitudes │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ nombre       │     │ rut          │     │ codigo (UNIQ)│
│ actividad    │     │ nombre       │     │ tipo         │
│ division     │     │ genero       │     │ detalle      │
│ formato      │     │ fechaNacim.  │     │ estado       │
│ estado       │     │ establecim.  │     │ actividad    │
│ requisitos   │     │ actividad    │     │ establecim.  │
│ fechaApertura│     │ division     │     │ inscripcion  │
│ fechaCierre  │     │ inscripcion  │     │ torneo       │
└──────┬───────┘     └──────┬───────┘     │ division     │
       │                    │             │ alumno (leg.)│
       │                    │             └──────┬───────┘
       │                    │                    │
       │     ┌──────────────┴───────┐            │
       │     │  alumno_torneos      │            │
       │     ├──────────────────────┤            │
       │     │ alumno (FK)          │            │
       │     │ torneo (FK)          │            │
       │     └──────────────────────┘            │
       │                                         │
       │     ┌──────────────┐                    │
       └────►│  llaves      │                    │
             ├──────────────┤                    │
             │ id (PK)      │                    │
             │ torneo (FK)  │                    │
             │ fecha, hora  │                    │
             │ lugar        │                    │
             │ puntajeA/B   │                    │
             │ ganador      │                    │
             │ estado       │                    │
             └──────────────┘                    │
                                                  │
       ┌──────────────┐                           │
       │solicitud_alum│◄──────────────────────────┘
       ├──────────────┤
       │ id (PK)      │
       │ solicitud(FK)│
       │ rut, nombre  │
       │ genero       │
       │ fechaNacim.  │
       │ apoderado    │
       │ email, tel.  │
       └──────────────┘
```

### 3.4 Tecnologías utilizadas

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | Node.js + Express | Ligero, asíncrono, ideal para APIs REST. |
| Base de datos | SQLite (better-sqlite3) | Sin servidor, portable, ideal para despliegue simple. |
| Autenticación | JWT (jsonwebtoken) + bcryptjs | Estándar de la industria, seguro. |
| Correo | Nodemailer | Soporte SMTP, fácil configuración. |
| Frontend | HTML5 + CSS3 + JavaScript (SPA) | Sin dependencias de frameworks, carga rápida. |
| Validación | reCAPTCHA v3 | Protección contra bots en formularios. |
| Hosting | Render (Blueprint) | Despliegue automático desde GitHub. |

### 3.5 Diagrama de casos de uso (simplificado)

```
┌─────────────────────────────────────────────┐
│                  DAEM                        │
├─────────────────────────────────────────────┤
│  Admin DAEM:                                │
│    - Gestionar actividades, torneos,        │
│      establecimientos, usuarios              │
│    - Aprobar/rechazar inscripciones          │
│    - Aprobar/rechazar solicitudes (lote)     │
│    - Ver reportes y estadísticas             │
│    - Programar agenda de partidos            │
│                                             │
│  Coordinador:                               │
│    - Inscribir establecimiento en actividades│
│    - Solicitar estudiantes (por lote)        │
│    - Postular estudiantes a torneos (lote)   │
│    - Gestionar lectores de su colegio        │
│    - Ver nómina y agenda                     │
│                                             │
│  Director (Lector):                         │
│    - Consultar estudiantes de su colegio     │
│    - Consultar agenda de torneos             │
│    - Consultar feriados                     │
└─────────────────────────────────────────────┘
```

---

## 4. Implementación

### 4.1 Estructura del proyecto

```
DAEM/
├── config/          # Configuración de BD
├── constants/       # Catálogos (roles, áreas, divisiones)
├── controllers/     # Controladores HTTP
├── db/              # Conexión y esquema SQLite
├── domain/          # Clases de dominio (POO)
├── middleware/      # Auth, validación de rol, solo lectura
├── public/          # Frontend (HTML, CSS, JS)
│   ├── css/estilos.css
│   ├── js/app.js
│   ├── js/api.js
│   └── index.html
├── repositories/    # Acceso a datos (SQL)
├── routes/          # Rutas Express
├── seed/            # Datos iniciales
├── services/        # Lógica de negocio
├── server.js        # Punto de entrada
├── render.yaml      # Configuración Render
└── package.json
```

### 4.2 Módulos implementados

#### 4.2.1 Autenticación y usuarios
- Login con RUT (admin/director) o RBD (coordinador).
- Recuperación de clave por correo con token JWT (1 hora de validez).
- CRUD de usuarios con validación por rol.
- Hash de contraseñas con bcrypt (10 rounds).
- JWT con expiración de 12 horas.

#### 4.2.2 Establecimientos
- Directorio MINEDUC: consulta al servicio ArcGIS de la IDE (SMA), filtrado por comuna de Los Ángeles (Biobío).
- Agregar establecimiento desde el directorio o manual (RBD validado).
- Edición y eliminación de establecimientos propios.

#### 4.2.3 Actividades
- CRUD con categorías y subcategorías (ej. SUB 13 → Damas/Varones).
- Asignación a secciones y áreas (Deportiva / Artístico-Cultural).
- Ventanas de inscripción (apertura/cierre).
- Límite de inscritos, edad mínima/máxima.
- Recintos asociados.

#### 4.2.4 Torneos
- Creación con formato (amistoso/competitivo).
- Programación: fechas, llaves, partidos, horarios, lugares.
- Requisitos (edad mín/máx, género).
- Suspensión/reactivación, eliminación definitiva.
- Paginación: 4 por página.

#### 4.2.5 Inscripciones
- Inscripción de establecimiento en actividad/categoría.
- Estados: en_proceso → aceptada/rechazada.
- Solo admin puede aprobar/rechazar.

#### 4.2.6 Solicitudes (por lote)
- El coordinador solicita inscripción de estudiantes (uno o varios en un lote).
- Código único por solicitud (ej. `SOL-XXXX-YYYY`).
- Tabla `solicitud_alumnos` para desglosar los estudiantes.
- El admin aprueba/rechaza el lote completo.
- Al aprobar, los estudiantes se agregan a la nómina.
- El coordinador puede retractar solicitudes en proceso.
- Modal "Ver estudiantes" para desglosar el lote.

#### 4.2.7 Postulación a torneos
- Postulación por lote desde la nómina (checkboxes).
- Registro de nuevo estudiante (queda como solicitud al admin).
- Validación de requisitos (edad, género) en cliente y servidor.

#### 4.2.8 Agenda
- Calendario mensual con días con torneo en color diferente.
- Lista de partidos con búsqueda y paginación.
- Edición de horarios (admin).

#### 4.2.9 Notificaciones
- Notificaciones persistentes por usuario.
- Descartar/restaurar (historial).
- Contador en campana del dashboard.

#### 4.2.10 Reportes y estadísticas
- Participaciones por establecimiento.
- Beneficiarios (estudiantes) por establecimiento y semestre.
- Trazabilidad histórica (por año: beneficiarios, inscripciones).

#### 4.2.11 Recordatorios por correo
- Scheduler cada 60 segundos.
- Envío 1 día y 1 hora antes de: encuentros, partidos, apertura/cierre de inscripciones.
- Tabla `recordatorios_enviados` para evitar duplicados.

#### 4.2.12 Feriados
- Consulta de feriados legales de Chile (servicio externo).
- Paginación: 3 por página.

### 4.3 Funcionalidades de UX
- **Toasts**: mensajes centrados, grandes (17px), borde verde (éxito) / rojo (error).
- **Pantalla de carga**: overlay con spinner durante operaciones de escritura.
- **Paginación**: barra arriba, debajo del buscador, en todos los módulos.
- **Inactividad**: cierre de sesión tras 10 minutos sin uso.
- **RUT formateado**: puntos y guión automáticos (22.113.000-6).
- **Login por RBD**: coordinadores ingresan con RBD de su establecimiento.
- **Botón "ojo"**: mostrar/ocultar clave en login.
- **Filtros**: por área, formato, rol, establecimiento, etc.

---

## 5. Plan de pruebas

### 5.1 Casos de prueba funcionales

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Login admin | Ingresar RUT 11111111-1 / clave admin123 | Acceso al dashboard de admin | ✅ |
| CP-02 | Login coordinador por RBD | Ingresar RBD 4160 / clave coord123 | Acceso al dashboard de coordinador | ✅ |
| CP-03 | Login director por RUT | Ingresar RUT 77777777-7 / clave director123 | Acceso al dashboard de director (solo lectura) | ✅ |
| CP-04 | Login con RUT formateado | Ingresar "11.111.111-1" en el login | Acceso exitoso (normalización de puntos) | ✅ |
| CP-05 | Crear usuario | Admin → Usuarios → + Nuevo → llenar datos → Guardar | Usuario creado, aparece en la tabla | ✅ |
| CP-06 | Editar usuario | Admin → Usuarios → Editar → cambiar nombre → Guardar cambios | Usuario actualizado, toast de éxito | ✅ |
| CP-07 | Eliminar usuario | Admin → Usuarios → Eliminar → confirmar | Usuario eliminado | ✅ |
| CP-08 | Crear actividad | Admin → Actividades → + Nueva → llenar → Guardar | Actividad creada | ✅ |
| CP-09 | Editar actividad | Admin → Actividades → Editar → cambiar → Guardar | Actividad actualizada | ✅ |
| CP-10 | Crear torneo | Admin → Torneos → + Nuevo Torneo → llenar → Guardar | Torneo creado con formato | ✅ |
| CP-11 | Programar torneo | Admin → Torneos → Programar → fechas/llaves → Guardar | Torneo programado, aparece en agenda | ✅ |
| CP-12 | Suspender torneo | Admin → Torneos → Suspender → confirmar | Torneo suspendido, no visible para coordinadores | ✅ |
| CP-13 | Inscribir establecimiento | Coordinador → Postulaciones → inscribir en actividad | Inscripción en estado "en_proceso" | ✅ |
| CP-14 | Aprobar inscripción | Admin → Inscripciones → Aceptar | Inscripción aceptada | ✅ |
| CP-15 | Solicitar estudiantes (lote) | Coordinador → Solicitudes → + Añadir → agregar varios → Enviar | Solicitud creada con código de lote | ✅ |
| CP-16 | Aprobar solicitud (lote) | Admin → Solicitudes → Aprobar | Todos los estudiantes agregados a la nómina | ✅ |
| CP-17 | Retractar solicitud | Coordinador → Solicitudes → Retractar | Solicitud eliminada | ✅ |
| CP-18 | Postular a torneo (lote) | Coordinador → Postular Torneos → checkboxes → Postular seleccionados | Estudiantes postulados | ✅ |
| CP-19 | Registrar nuevo estudiante en torneo | Coordinador → Postular Torneos → registrar nuevo → Solicitar | Solicitud enviada al admin | ✅ |
| CP-20 | Editar participante | Coordinador → Postulaciones → Ver cartelera → clic actividad → Editar | Modal con datos, confirmación de notificación, guardado | ✅ |
| CP-21 | Ver estudiantes de solicitud | Admin/Coordinador → Solicitudes → Ver estudiantes | Modal con lista de estudiantes del lote | ✅ |
| CP-22 | Paginación | Navegar entre páginas en cualquier listado | Cambio de página correcto | ✅ |
| CP-23 | Paginación arriba | Verificar que la barra esté debajo del buscador | Barra visible arriba | ✅ |
| CP-24 | Feriados 3 por página | Admin → Feriados → verificar | 3 feriados por página, 6 páginas | ✅ |
| CP-25 | Torneos 4 por página | Admin/Coordinador → Torneos | 4 torneos por página | ✅ |
| CP-26 | Actividades 4 por página | Admin → Actividades | 4 actividades por página | ✅ |
| CP-27 | Toast de éxito | Guardar cualquier dato | Tarjeta verde centrada | ✅ |
| CP-28 | Toast de error | Intentar guardar sin datos | Tarjeta roja centrada | ✅ |
| CP-29 | Pantalla de carga | Guardar/eliminar cualquier dato | Overlay con spinner y "Procesando..." | ✅ |
| CP-30 | Inactividad 10 min | No usar la página por 10 min | Sesión cerrada automáticamente | ✅ |
| CP-31 | Agenda días con torneo | Ver calendario con partidos | Días con torneo en color dorado | ✅ |
| CP-32 | Reportes trazabilidad | Admin → Reportes → ver tabla | Tabla con Año, Beneficiarios, Inscripciones | ✅ |
| CP-33 | Recuperación de clave | Olvidé mi clave → correo → enlace → nueva clave | Clave cambiada, login con nueva clave | ✅ |
| CP-34 | Recordatorios por correo | Crear evento a 1 hora → esperar scheduler | Correo enviado (verificado por logs) | ✅ |
| CP-35 | Filtro por área en torneos | Admin → Torneos → seleccionar área | Solo torneos de esa área | ✅ |
| CP-36 | Filtro por formato en postulaciones | Coordinador → Postular Torneos → filtro | Solo torneos del formato seleccionado | ✅ |
| CP-37 | Validación RBD | Crear establecimiento con RBD inexistente | Error: "El RBD no existe en el listado MINEDUC" | ✅ |
| CP-38 | Validación edad mínima 3 años | Agregar estudiante menor de 3 años | Error: "El estudiante debe tener al menos 3 años" | ✅ |
| CP-39 | Formato RUT automático | Escribir RUT en login | Se formatea con puntos y guión | ✅ |
| CP-40 | Login por RBD | Coordinador ingresa con RBD | Acceso exitoso | ✅ |

### 5.2 Evidencias de pruebas
- Servidor corriendo: `http://localhost:3000/api/health` → `{"estado":"activo"}`.
- `node --check public/js/app.js` → sin errores.
- `node --check server.js` → sin errores.
- Estilos computados verificados en Chrome (toasts, paginación, calendario).
- Flujos end-to-end probados con datos de prueba (solicitudes por lote, edición de participantes, postulación por lote).

---

## 6. Conclusiones y reflexión

### 6.1 Resultados obtenidos
El sistema DAEM cumple con todos los requisitos funcionales solicitados: gestión de actividades, torneos, inscripciones, solicitudes por lote, postulación de estudiantes, reportes y notificaciones. La implementación siguió buenas prácticas (POO, arquitectura en capas, validaciones, paginación, toasts, pantalla de carga).

### 6.2 Dificultades encontradas
1. **Encoding de caracteres**: problemas con mojibake (UTF-8 vs Latin-1) en el archivo `app.js`, corregidos mediante conversión de encoding y reemplazos manuales.
2. **Caché del navegador**: los cambios de CSS/JS no se reflejaban; se resolvió agregando versiones (`?v=XX`) a los archivos.
3. **reCAPTCHA**: el primer intento de login tras recargar la página puede fallar (403); se documentó como comportamiento esperado.
4. **Estructura CSS**: la media query `@media (max-width: 1200px)` envolvía reglas que debían aplicar en todas las resoluciones; se solucionó duplicando reglas clave a nivel superior.
5. **SQLite en Render**: el plan gratuito no soporta discos persistentes; se documentó la limitación y la opción de migrar a PostgreSQL.

### 6.3 Mejoras futuras
1. **Migración a PostgreSQL**: para persistencia real en producción (Render free tier).
2. **App móvil**: versión nativa o PWA para coordinadores en terreno.
3. **Notificaciones push**: además de correo, notificaciones en tiempo real (WebSockets).
4. **Exportación de reportes**: PDF/Excel de estadísticas y trazabilidad.
5. **Auditoría**: registro de quién hizo qué y cuándo (log de acciones).
6. **Tests automatizados**: unitarios y de integración (Jest + Supertest).
7. **CI/CD**: pipeline de GitHub Actions para tests y deploy automático.
8. **Internacionalización**: soporte multi-idioma.

### 6.4 Lecciones aprendidas
- La importancia de mantener encoding UTF-8 consistente en todos los archivos.
- La paginación y la carga asíncrona mejoran significativamente la experiencia de usuario.
- Las solicitudes por lote reducen drásticamente el trabajo manual del administrador.
- El despliegue en plataformas cloud requiere considerar la persistencia de datos (SQLite vs PostgreSQL).

---

*Informe generado el 23 de noviembre de 2026. Proyecto: DAEM (Gestión de Actividades Extraescolares). Repositorio: https://github.com/pppaloo/DAEMPROYECTO.git*
