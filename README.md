# Lumina Auth App

Aplicación web full-stack PERN + Prisma: PostgreSQL, Express, React y Node.js, con Prisma como ORM. El frontend es una aplicación React impulsada por Vite y el backend es una API Express gestionada con nodemon.

## Requisitos

- Node.js 18+
- npm
- PostgreSQL

## Configuración de PostgreSQL

1. Crea una base de datos PostgreSQL llamada `lumina_auth`.
2. Copia `backend/.env.example` a `backend/.env`.
3. Ajusta `DATABASE_URL` en `backend/.env` con tu usuario y contraseña de PostgreSQL.

Las tablas se crean con las migraciones de Prisma (`backend/prisma/migrations`). Los scripts `dev` y `start` del backend aplican automáticamente las migraciones pendientes (`prisma migrate deploy`) antes de iniciar la API.

> Si ya tenías la base `lumina_auth` creada por la versión anterior (TypeORM), elimínala y créala de nuevo antes de iniciar: la migración inicial crea la tabla `users` y los usuarios iniciales se vuelven a sembrar al arrancar.

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

| Rol | Correo electrónico | Contraseña |
| --- | --- | --- |
| Admin | `admin@lumina.app` | `admin2026` |
| Manager | `manager@lumina.app` | `manager2026` |
| Usuario | `usuario@lumina.app` | `usuario2026` |

## Estructura del proyecto

```
backend/
├── prisma/
│   ├── schema.prisma      modelos de datos
│   └── migrations/        migraciones de PostgreSQL
└── src/
    ├── config/            variables de entorno, cliente Prisma y usuarios iniciales
    ├── routes/            endpoints: conectan middlewares y controladores
    ├── middlewares/       autenticación, validación de entrada y manejo de errores
    ├── controllers/       reciben req/res, llaman al servicio y responden
    ├── services/          reglas del negocio y acceso a datos con Prisma
    ├── app.js             arma la aplicación Express
    └── index.js           conecta la base de datos e inicia el servidor

frontend/
└── src/
    ├── pages/             pantallas completas
    ├── components/        piezas reutilizables
    ├── services/          comunicación con el backend (único lugar con fetch)
    ├── utils/             funciones auxiliares
    ├── App.jsx
    └── main.jsx
```

Flujo de una petición en el backend: `routes → middlewares → controllers → services → Prisma → PostgreSQL`.

Para cambiar el modelo de datos, edita `backend/prisma/schema.prisma` y ejecuta `npm run migrate` dentro de `backend/` para crear la migración.

## Notas

Establece un `JWT_SECRET` robusto, sirve la aplicación mediante HTTPS y mueve los tokens a cookies httpOnly seguras antes del despliegue.
