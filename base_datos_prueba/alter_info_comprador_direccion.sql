-- Agrega columnas de direccion a info_comprador
-- Nota: si la columna pais ya existe, omite esa linea o ejecuta solo las nuevas.

ALTER TABLE info_comprador
    ADD COLUMN estado_residencia VARCHAR(100) NULL AFTER pais,
    ADD COLUMN ciudad VARCHAR(120) NULL AFTER estado,
    ADD COLUMN municipio VARCHAR(120) NULL AFTER ciudad,
    ADD COLUMN calle VARCHAR(180) NULL AFTER municipio;
