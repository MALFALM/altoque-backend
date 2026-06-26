# Altoque Backend

Backend del sistema Altoque - Simulador de Crédito Vehicular, desarrollado con Node.js, Express y MySQL.
Este backend permite registrar usuarios, iniciar sesión, simular créditos vehiculares y guardar las operaciones generadas en una base de datos relacional.


# Tecnologías utilizadas

- Node.js
- Express
- MySQL
- mysql2
- dotenv
- cors
- bcryptjs
- jsonwebtoken
- nodemon


# Estructura del proyecto

```bash
altoque-backend/ 
│ 
├── database/ 
│ └── altoque_db.sql 
│ 
├── src/ 
│ ├── config/ 
│ │ └── db.js 
│ │ 
│ ├── controllers/ 
│ │ └── auth.controller.js 
│ │ 
│ ├── routes/ 
│ │ ├── auth.routes.js 
│ │ └── credito.routes.js 
│ │ 
│ └── app.js
│ 
├── .env.example 
├── .gitignore 
├── package.json 
└── README.md
```


# Instalación

1. Clonar el repositorio

```bash
git clone https://github.com/MALFALM/altoque-backend.git
```

2. Ingresar a la carpeta del backend

```bash
cd altoque-backend
```

3. Instalar dependencias

```bash
npm install
```