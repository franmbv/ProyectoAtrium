# Guia de Seeding - Museo Atrium

## Requisitos previos

1. **Node.js** instalado (v18+)
2. **MySQL/MariaDB** corriendo (XAMPP, WAMP o standalone)
3. PHPMyAdmin o cliente MySQL accesible

## Paso 1: Crear la base de datos

Abrir PHPMyAdmin o cliente MySQL y ejecutar el SQL dump:

```
base_datos_prueba/museodeartecontemporaneo (2).sql
```

Esto crea la BD `museodeartecontemporaneo` con:
- 5 generos (Pintura, Escultura, Fotografia, Ceramica, Orfebreria)
- 3 roles (Administrador, Comprador, Superadmin)
- 10 preguntas de seguridad
- Todas las tablas y relaciones

## Paso 2: Descargar imagenes de arte

```bash
node base_datos_prueba/download_images.js
```

- Descarga 1000 imagenes de dominio publico del Metropolitan Museum of Art (CC0)
- Las guarda en `public/uploads/met_*.jpg`
- Genera `base_datos_prueba/met_images_metadata.json` con los metadatos
- Tiempo estimado: 10-15 minutos ( depende de la conexion)
- Si se interrumpe, se puede reejecutar y retoma desde donde quedo

## Paso 3: Ejecutar el seeding completo

```bash
node base_datos_prueba/seed_full.js
```

Este script inserta y sincroniza:

### 100 Artistas
- Nombres, apellidos, nacionalidades, fechas generadas aleatoriamente
- Insert en MySQL + sync a MongoDB y Neo4j

### 1000 Obras
- Distribucion uniforme: 200 por genero (Pintura, Escultura, Fotografia, Ceramica, Orfebreria)
- Con detalles especificos segun el genero
- Precios entre $500 y $50,000
- Fotos reales del Met Museum
- Insert en MySQL + sync a MongoDB, Neo4j y Cassandra

### 100 Compradores
- Cedula, email, login unicos
- Password universal: `Comprador123!`
- 3 preguntas de seguridad cada uno
- Membresia activa ($10)
- Insert en MySQL + sync a Neo4j y Cassandra

Tiempo estimado: 5-10 minutos

## Paso 4: Verificar

### MySQL
```sql
SELECT COUNT(*) FROM artista;      -- Debe retornar 100
SELECT COUNT(*) FROM obra;         -- Debe retornar 1000
SELECT COUNT(*) FROM usuario
WHERE rol_id = 2;                  -- Debe retornar 100
```

### MongoDB (Catalogo)
Abrir en navegador:
```
https://mongo-mp55.onrender.com/catalog/search
```

### Neo4j (Recomendaciones)
El microservicio debe estar corriendo en `http://localhost:8000`

### Cassandra (Auditoria)
```
https://museoatrium-auditoria.onrender.com/seguridad/logs
```

## Datos de acceso

| Usuario | Contrasena | Rol |
|---------|-----------|-----|
| (usar admins existentes) | (usar admins existentes) | Administrador |
| (cualquier login generado) | `Comprador123!` | Comprador |

## Archivos generados

```
public/uploads/
  met_*.jpg                  -- 1000 imagenes de arte

base_datos_prueba/
  download_images.js         -- Script de descarga de imagenes
  met_images_metadata.json   -- Metadatos de las imagenes
  seed_full.js               -- Script maestro de seeding
```

## Solucion de problemas

### MySQL no conecta
- Verificar que MySQL este corriendo en puerto 3306
- Revisar credenciales en `.env`:
  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=museodeartecontemporaneo
  ```

### Error "Faltan datos seed"
- Ejecutar primero el SQL dump `museodeartecontemporaneo (2).sql`

### MongoDB/Neo4j no sincronizan
- El script continua aunque fallen las sincronizaciones
- MySQL queda como fuente de verdad
- Sincronizar manualmente despues levantando los microservicios

### Imagenes no aparecen
- Verificar que `public/uploads/` tenga archivos `met_*.jpg`
- Las imagenes se sirven desde `/uploads/` en Express

## Comandos rapidos

```bash
# Descargar imagenes (si no se tienen)
node base_datos_prueba/download_images.js

# Ejecutar seeding completo
node base_datos_prueba/seed_full.js

# Limpiar imagenes descargadas
del public\uploads\met_*

# Limpiar metadata
del base_datos_prueba\met_images_metadata.json
```
