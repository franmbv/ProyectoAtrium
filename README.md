# 🏛️ Proyecto Atrium: Plataforma Políglota para el Museo de Arte Contemporáneo

Sistema de gestión museística basado en arquitectura de microservicios con persistencia políglota, diseñado para soportar transacciones ACID, catálogo dinámico NoSQL y auditoría distribuida.

## 🏗️ Estructura del Proyecto (Monolito Core)

```text
/ProyectoAtrium
├── app.js                # Punto de entrada y orquestador principal
├── .env                  # Variables de entorno (SUPABASE, MONGO_API, etc.)
├── package.json          # Dependencias (pg, express, multer, puppeteer)
├── public/               # Recursos estáticos y uploads
│   └── css/styles.css    # Estilos globales
├── src/
│   ├── config/           # Configuración (db.js, mailer.js, auditoria.js)
│   ├── controllers/      # Lógica de negocio (admin, auth, galeria, pago)
│   ├── models/           # Persistencia SQL (Obra, Artista, Venta, Usuario)
│   ├── routes/           # Enrutadores (admin, auth, galeria, pago, ia)
│   └── services/         # Integración NoSQL (MongoSync, Neo4jSync)
└── views/
    ├── admin/            # Paneles gerenciales (Dashboard, Inventario, Reportes)
    ├── auth/             # Registro y Login
    ├── galeria/          # Interfaz pública y detalle de obras
    ├── user/             # Historial y facturas del comprador
    └── partials/         # Componentes reutilizables (head, navbar, footer)

🛠️ Tecnologías Utilizadas

    Backend: Node.js, Express, EJS.

    Persistencia Relacional: PostgreSQL (Neon.tech).

    Persistencia Documental: MongoDB (Atlas).

    Auditoría NoSQL: Apache Cassandra (Astra DB).

    Recomendaciones: Neo4j (Grafos).

    Almacenamiento: Supabase Storage (CDN).

    Notificaciones: Pipedream Webhook API + Gmail.

🚀 Despliegue en Producción

    Hosting: Render.com

    Estrategia de despliegue: Pipeline CI/CD integrado con GitHub.

    Gestión de Cold Starts: Ping asíncrono desde app.js hacia microservicios en la nube.