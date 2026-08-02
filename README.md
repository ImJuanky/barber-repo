# Sistema de Reservas para Peluquería

Aplicación web completa para gestionar las reservas de una peluquería: los clientes reservan cita desde un enlace o código QR (sin registro), y el administrador gestiona horarios, reservas y un calendario desde un panel privado. Cada reserva confirmada crea automáticamente un evento en Google Calendar.

## Stack tecnológico

- **Frontend**: Angular 22 (standalone components) + Angular Material, TypeScript, responsive.
- **Backend**: Node.js + Express, JWT, API REST.
- **Base de datos**: MySQL + Sequelize (ORM).
- **Calendario**: Google Calendar API (OAuth2).

## Estructura del proyecto

```
barber/
├── backend/            API REST (Node + Express + Sequelize)
│   ├── src/
│   │   ├── config/      Configuración de Sequelize
│   │   ├── models/      Admin, Slot, Booking
│   │   ├── middleware/  Auth JWT, validación, rate limiting, errores
│   │   ├── controllers/ Lógica de negocio
│   │   ├── routes/      Definición de endpoints
│   │   └── services/    Integración con Google Calendar
│   ├── database/
│   │   ├── schema.sql    Script de creación de la base de datos
│   │   └── seed.js       Crea el administrador inicial
│   ├── get-google-token.js  Script para obtener el refresh token de Google
│   └── .env.example
└── frontend/            Aplicación Angular
    └── src/app/
        ├── core/         Servicios, guards, interceptores, modelos
        └── features/
            ├── client-booking/   Vista pública de reserva
            └── admin/            Login, calendario, huecos y reservas
```

## 1. Instalar dependencias

Requisitos previos: Node.js 20+, npm, y un servidor MySQL 8+ accesible.

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## 2. Crear la base de datos

Con MySQL en marcha, ejecuta el script SQL incluido:

```bash
mysql -u root -p < backend/database/schema.sql
```

Esto crea la base de datos `peluqueria` y las tablas `admins`, `slots` y `bookings` con sus relaciones y claves foráneas. Opcionalmente, dentro de `schema.sql` hay comentado un `CREATE USER` para crear un usuario de aplicación con permisos limitados (recomendado en producción).

## 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` y rellena, como mínimo:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: credenciales de tu MySQL.
- `JWT_SECRET`: una cadena larga y aleatoria (por ejemplo, generada con `openssl rand -hex 32`).
- `CORS_ORIGIN`: la URL desde la que se servirá el frontend (por ejemplo `http://localhost:4200` en desarrollo).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: credenciales del administrador que se creará en el siguiente paso.

Las variables `GOOGLE_*` se explican en el punto 6.

Con las variables listas, crea el usuario administrador inicial:

```bash
npm run seed
```

En el frontend, edita `frontend/src/environments/environment.development.ts` (desarrollo) y `environment.ts` (producción) para que `apiUrl` apunte a la URL de tu backend.

## 4. Arrancar el backend

```bash
cd backend
npm run dev     # con recarga automática (nodemon)
# o
npm start       # producción
```

El servidor arranca en `http://localhost:3000` (o el puerto definido en `PORT`). Puedes comprobar que funciona visitando `http://localhost:3000/api/health`.

## 5. Arrancar el frontend

```bash
cd frontend
npm start
```

La aplicación se sirve en `http://localhost:4200`.

- **Vista del cliente**: `http://localhost:4200/reservar` — es la URL que debes codificar en el código QR que coloques en tu peluquería.
- **Panel de administración**: `http://localhost:4200/admin/login`

Para producción, genera el build optimizado:

```bash
npm run build
```

Los archivos estáticos se generan en `frontend/dist/frontend/browser`.

## 6. Conectar Google Calendar

Los eventos se crean usando una cuenta de Google mediante OAuth2. Pasos:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) y crea un proyecto nuevo (o usa uno existente).
2. En **APIs y servicios → Biblioteca**, busca "Google Calendar API" y actívala.
3. En **APIs y servicios → Pantalla de consentimiento OAuth**, configura el tipo "Externo", añade tu cuenta de Gmail como usuario de prueba y guarda.
4. En **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: "Aplicación de escritorio" (más simple para este flujo).
   - Copia el `Client ID` y el `Client secret` generados.
5. En `backend/.env`, rellena:
   ```
   GOOGLE_CLIENT_ID=tu_client_id
   GOOGLE_CLIENT_SECRET=tu_client_secret
   ```
6. Ejecuta el script auxiliar incluido para obtener el `refresh_token`:
   ```bash
   cd backend
   node get-google-token.js
   ```
   Abre la URL que se muestra, inicia sesión con la cuenta de Google cuyo calendario quieres usar (la misma que luego sincronizarás con tu iPhone), autoriza el acceso y pega el código que te da Google en la terminal.
7. Copia el `GOOGLE_REFRESH_TOKEN` resultante en `backend/.env`.
8. Reinicia el backend. A partir de ahora, cada reserva confirmada creará automáticamente un evento de 30 minutos en el Google Calendar de esa cuenta, con el nombre y teléfono del cliente.

Para que las citas aparezcan en tu iPhone, añade esa misma cuenta de Google en **Ajustes → Calendario → Cuentas → Añadir cuenta → Google** en tu iPhone, y activa la sincronización de Calendario.

Si no configuras estas variables, la aplicación funciona igualmente (las reservas se guardan en la base de datos), simplemente no se crea el evento en Google Calendar.

## 7. Despliegue en producción

### Opción A: VPS (recomendado, backend + MySQL + frontend en el mismo servidor)

1. Instala Node.js 20+, MySQL 8+ y Nginx en el VPS.
2. Sube el proyecto (git clone o scp) y sigue los pasos 1-3 de este README en el servidor.
3. Backend: usa un gestor de procesos como PM2 para mantenerlo corriendo:
   ```bash
   npm install -g pm2
   cd backend
   pm2 start src/server.js --name peluqueria-api
   pm2 save
   ```
4. Frontend: genera el build de producción (`npm run build` dentro de `frontend`) y sirve la carpeta `dist/frontend/browser` con Nginx.
5. Configura Nginx como proxy inverso: `/` sirve los archivos estáticos del frontend, y `/api` redirige al backend (`http://localhost:3000`).
6. Activa HTTPS con Let's Encrypt (`certbot`) — imprescindible, ya que el navegador y el código QR deben usar `https://`.
7. Actualiza `CORS_ORIGIN` en `.env` y `apiUrl` en `environment.ts` con tus dominios reales, y vuelve a generar el build del frontend.

### Opción B: Frontend en Vercel + backend en un VPS/Railway/Render

- El **frontend** (Angular) se puede desplegar directamente en Vercel: importa el repositorio, indica `frontend` como directorio raíz, comando de build `npm run build` y directorio de salida `dist/frontend/browser`.
- El **backend** necesita un entorno Node.js persistente con acceso a MySQL (Vercel no es adecuado para esto). Puedes usar un VPS, Railway o Render para el backend y una base de datos MySQL gestionada (PlanetScale, Railway, etc.).
- Actualiza `apiUrl` en `frontend/src/environments/environment.ts` con la URL pública de tu backend, y `CORS_ORIGIN` en el backend con el dominio de Vercel.

## Generar el código QR

El QR debe apuntar a la URL pública de reserva, por ejemplo `https://tudominio.com/reservar`. Puedes generarlo con cualquier generador de QR online introduciendo esa URL.

## Seguridad incluida

- Contraseñas de administrador con hash `bcrypt`.
- Autenticación mediante JWT con expiración configurable.
- Cabeceras de seguridad con `helmet`.
- CORS restringido al dominio del frontend.
- Validación de formularios en frontend y backend (`express-validator`).
- Sanitización de entradas para mitigar XSS.
- Protección contra SQL Injection mediante el uso de Sequelize (consultas parametrizadas).
- Límite de peticiones (`rate limiting`) en login y en la creación de reservas.
