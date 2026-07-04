# Altoque Backend

Backend del sistema Altoque, simulador de credito vehicular con Node.js, Express y MySQL.

## Stack

- Node.js
- Express
- MySQL / mysql2
- bcryptjs
- jsonwebtoken
- dotenv
- cors

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus credenciales MySQL y un `JWT_SECRET` largo.

## Base de datos

Importa el esquema:

```bash
mysql -u root -p < database/altoque_db.sql
```

El SQL crea:

- Usuarios y roles
- Clientes
- Vehiculos
- Creditos y cronogramas
- Entidades financieras
- Productos financieros
- Promociones

Tambien incluye bancos y productos demo para BCP, Interbank y BBVA.

> Nota: el script actual recrea las tablas. Usalo en desarrollo o respalda datos antes de ejecutarlo.

## Ejecutar

```bash
npm run dev
```

Backend esperado: `http://localhost:3000`.

## Crear primer admin

El registro publico solo crea usuarios `client`. Para crear el primer administrador usa el endpoint de bootstrap. Solo funciona si no existe ningun admin.

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@altoque.com","password":"AdminAltoque123"}'
```

Luego inicia sesion desde el frontend con esas credenciales.

## Endpoints MVP

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/bootstrap-admin`
- `GET /api/auth/users` admin
- `PATCH /api/auth/users/:id/role` admin
- `POST /api/auth/banks` admin

### Entidades / productos / promociones

- `GET /api/entities` publico/autenticado
- `POST /api/entities` admin
- `PATCH /api/entities/:id` admin
- `POST /api/entities/:entityId/products` admin/bank
- `PATCH /api/entities/:entityId/products/:productId` admin/bank

### Creditos

- `POST /api/creditos/simular` publico
- `POST /api/creditos/guardar` client/admin
- `GET /api/creditos` client/admin
- `GET /api/creditos/:id` client/admin
- `GET /api/creditos/:id/cronograma` client/admin

## Seguridad implementada para MVP

- JWT obligatorio en endpoints sensibles.
- Autorizacion por roles.
- Registro publico restringido a rol `client`.
- CORS limitado por `CORS_ORIGIN`.
- Usuarios banco asociados a una entidad financiera.
- Bancos solo pueden editar productos de su entidad.
