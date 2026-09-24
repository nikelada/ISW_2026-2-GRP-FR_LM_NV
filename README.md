# Lumina Auth App

Una aplicación web de inicio de sesión full-stack con dos proyectos independientes: un frontend en HTML/JavaScript puro impulsado por Vite y un backend en Express con JavaScript gestionado con nodemon.

## Requisitos

- Node.js 18+
- npm

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

La API se ejecuta en http://localhost:3000. La cuenta de demostración por defecto es:

- Correo electrónico: `demo@lumina.app`
- Contraseña: `demo1234`

## Estructura del proyecto

- `frontend/` contiene la aplicación Vite, el punto de entrada HTML, el JavaScript y el CSS.
- `backend/` contiene la API de Express, la lógica de autenticación y el script de nodemon.
- `frontend/.env.example` configura la URL de la API.
- `backend/.env.example` configura el puerto y el secreto JWT.

El frontend y el backend siguen siendo instalables de forma independiente, mientras que los scripts de la raíz los coordinan para el desarrollo habitual.

## Configuración de PostgreSQL

1. Crea una base de datos PostgreSQL llamada `lumina_auth`.
2. Copia `backend/.env.example` a `backend/.env`.
3. Establece tu contraseña de PostgreSQL en `backend/.env`.
4. Ejecuta `npm run dev` desde la raíz del proyecto.

El backend crea la tabla `users` y siembra estas cuentas en el primer arranque:

| Rol | Correo electrónico | Contraseña |
| --- | --- | --- |
| Admin | `admin@lumina.app` | `admin2026` |
| Manager | `manager@lumina.app` | `manager2026` |
| Usuario | `usuario@lumina.app` | `usuario2026` |

## Notas

Los usuarios se almacenan en PostgreSQL. `synchronize: true` es útil únicamente para el desarrollo local; usa migraciones antes de pasar a producción. Establece un `JWT_SECRET` robusto, sirve la aplicación mediante HTTPS y mueve los tokens a cookies httpOnly seguras antes del despliegue.
