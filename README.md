# NES Eventos

Aplicación web full-stack PERN + Prisma: PostgreSQL, Express, React y Node.js, con Prisma como ORM. El frontend es una aplicación React impulsada por Vite y el backend es una API Express gestionada con nodemon.

## Requisitos

- Node.js 18+
- npm
- PostgreSQL

## Configuración de PostgreSQL

1. Crea una base de datos en PostgreSQL.
2. Crea el archivo `backend/.env` con estos datos:
   - `DATABASE_URL`: conexión a tu base de datos, con el formato `postgresql://USUARIO:CONTRASEÑA@localhost:5432/NOMBRE_BASE?schema=public`.
   - `JWT_SECRET`: texto largo y aleatorio para firmar las sesiones.
   - `PORT`: puerto de la API (por defecto `3000`).

Las tablas se crean con las migraciones de Prisma (`backend/prisma/migrations`). Los scripts `dev` y `start` del backend aplican automáticamente las migraciones pendientes (`prisma migrate deploy`) antes de iniciar la API.

## Ejecutar en local

El frontend y el backend son proyectos independientes, pero trabajan juntos a través de la ruta `/api`. Vite redirige las peticiones de API del frontend hacia el backend de Express.

Para iniciar ambos juntos desde la raíz del proyecto:

```bash
npm install
npm run install:all
npm run dev
```

Abre http://localhost:5173.

También puedes ejecutarlos por separado en dos terminales.

### Backend

```bash
cd backend
npm install
npm run dev
```

La API se ejecuta en http://localhost:3000.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173.

## Usuarios iniciales

El backend siembra estas cuentas en el primer arranque:

| Área (rol) | Correo electrónico | Contraseña |
| --- | --- | --- |
| Administración (admin) | `admin@nes.cl` | `admin2026` |
| Gerencia (manager) | `manager@nes.cl` | `manager2026` |
| Producción y Comercial (usuario) | `usuario@nes.cl` | `usuario2026` |

## Datos de prueba

Para cargar clientes y solicitudes de ejemplo (incluidos eventos con fecha confirmada), ejecuta dentro de `backend/`:

```bash
npm run seed
```

Solo inserta datos si todavía no hay clientes registrados. Las fechas se calculan a partir del día en que se ejecuta.

## Estructura del proyecto

- `backend/prisma/` contiene el modelo de datos (`schema.prisma`) y las migraciones.
- `backend/src/` contiene la API de Express, separada en `config/`, `routes/`, `middlewares/`, `controllers/` y `services/`.
- `frontend/src/` contiene la aplicación React, separada en `pages/`, `components/` (y `components/ui/`), `hooks/`, `services/` y `utils/`.

Para cambiar el modelo de datos, edita `backend/prisma/schema.prisma` y ejecuta `npm run migrate` dentro de `backend/` para crear la migración.

## Notas

Establece un `JWT_SECRET` robusto, sirve la aplicación mediante HTTPS y mueve los tokens a cookies httpOnly seguras antes del despliegue.
