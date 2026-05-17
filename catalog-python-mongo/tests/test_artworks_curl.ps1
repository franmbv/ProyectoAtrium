param(
    [string]$BaseUrl = "http://127.0.0.1:8000",
    [string]$ArtworkId = ""
)

$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  Pruebas curl - Artworks PUT & DELETE  " -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

if (-not $ArtworkId) {
    Write-Host "ADVERTENCIA: No se proporciono ArtworkId." -ForegroundColor $Yellow
    Write-Host "Para probar PUT y DELETE necesitas un ID de una obra existente en la BD." -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Ejecutando pruebas de validacion (sin ID real)..." -ForegroundColor $Yellow
    Write-Host ""
}

function Invoke-CurlTest {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body,
        [string]$Description,
        [int]$ExpectedStatus
    )

    Write-Host "--------------------------------------------------" -ForegroundColor $Cyan
    Write-Host "TEST: $Description" -ForegroundColor $Cyan
    Write-Host "  $Method $Url" -ForegroundColor $Cyan

    $statusCode = 0
    $responseBody = ""

    try {
        if ($Body) {
            $tempFile = [System.IO.Path]::GetTempFileName()
            Set-Content -Path $tempFile -Value $Body -Encoding UTF8
            $raw = curl.exe -s -w "%{http_code}" -X $Method `
                -H "Content-Type: application/json" `
                -d "@$tempFile" `
                $Url 2>$null
            Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        } else {
            $raw = curl.exe -s -w "%{http_code}" -X $Method $Url 2>$null
        }

        if ($raw.Length -ge 3) {
            $statusCode = [int]$raw.Substring($raw.Length - 3)
            if ($raw.Length -gt 3) {
                $responseBody = $raw.Substring(0, $raw.Length - 3)
            }
        } elseif ($raw.Length -gt 0) {
            $statusCode = [int]$raw
        }

        if ($responseBody.Length -gt 250) {
            $bodyPreview = $responseBody.Substring(0, 250) + "..."
        } else {
            $bodyPreview = $responseBody
        }

        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  >> Status: $statusCode (esperado: $ExpectedStatus) [PASS]" -ForegroundColor $Green
        } else {
            Write-Host "  >> Status: $statusCode (esperado: $ExpectedStatus) [FAIL]" -ForegroundColor $Red
            if ($bodyPreview) {
                Write-Host "  >> Body: $bodyPreview" -ForegroundColor $Red
            }
        }
    } catch {
        Write-Host "  >> ERROR: $_" -ForegroundColor $Red
        if ($_.Exception.Message -like "*connection*") {
            Write-Host "  >> Asegurate de que el servidor este corriendo en $BaseUrl" -ForegroundColor $Yellow
        }
    }

    Write-Host ""
    return $statusCode
}

# ============================================
# PAYLOADS
# ============================================
$pinturaPayload = @'
{
    "genero": "pintura",
    "nombre": "La noche estrellada (actualizada)",
    "artista_id": "artist_001",
    "precio_venta": 18500.00,
    "fecha_creacion": "1889-06-01",
    "foto": "https://ejemplo.com/noche-estrellada.jpg",
    "descripcion": "Oleo sobre lienzo del pintor Vincent van Gogh",
    "tecnica": "oleo",
    "soporte": "lienzo",
    "alto_cm": 73.7,
    "ancho_cm": 92.1
}
'@

$esculturaPayload = @'
{
    "genero": "escultura",
    "nombre": "El pensador (actualizada)",
    "artista_id": "artist_002",
    "precio_venta": 85000.00,
    "fecha_creacion": "1904-01-01",
    "foto": "https://ejemplo.com/pensador.jpg",
    "material": "bronce",
    "peso_kg": 680,
    "largo_cm": 180,
    "ancho_cm": 98,
    "profundidad_cm": 140
}
'@

$fotoPayload = @'
{
    "genero": "fotografia",
    "nombre": "Migrant Mother (actualizada)",
    "artista_id": "artist_003",
    "precio_venta": 25000.00,
    "fecha_creacion": "1936-03-01",
    "foto": "https://ejemplo.com/migrant-mother.jpg",
    "descripcion": "Fotografia documental de la Gran Depresion",
    "tecnica": "analogica",
    "papel": "gelatina de plata",
    "alto_cm": 30.5,
    "ancho_cm": 40.6,
    "edicion": 3
}
'@

$ceramicaPayload = @'
{
    "genero": "ceramica",
    "nombre": "Jarron azul (actualizado)",
    "artista_id": "artist_004",
    "precio_venta": 3200.00,
    "fecha_creacion": "2023-05-15",
    "foto": "https://ejemplo.com/jarron-azul.jpg",
    "tipo_arcilla": "gres",
    "tecnica_coccion": "esmaltado",
    "peso_kg": 2.5,
    "alto_cm": 30,
    "ancho_cm": 15,
    "profundidad_cm": 15,
    "esmaltado": true
}
'@

$orfebreriaPayload = @'
{
    "genero": "orfebreria",
    "nombre": "Copa ceremonial (actualizada)",
    "artista_id": "artist_005",
    "precio_venta": 12000.00,
    "fecha_creacion": "1850-07-20",
    "foto": "https://ejemplo.com/copa-ceremonial.jpg",
    "material": "oro",
    "tecnica": "filigrana",
    "peso_g": 350,
    "alto_cm": 25,
    "ancho_cm": 12,
    "profundidad_cm": 12,
    "quilates": 18
}
'@

# ============================================
# 1-5: PUT para cada genero (200)
# ============================================
$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000001" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Body $pinturaPayload -Description "PUT Pintura" -ExpectedStatus 200

$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000002" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Body $esculturaPayload -Description "PUT Escultura" -ExpectedStatus 200

$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000003" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Body $fotoPayload -Description "PUT Fotografia" -ExpectedStatus 200

$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000004" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Body $ceramicaPayload -Description "PUT Ceramica" -ExpectedStatus 200

$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000005" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Body $orfebreriaPayload -Description "PUT Orfebreria" -ExpectedStatus 200

# ============================================
# 6. PUT 404 - ID inexistente
# ============================================
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/aaaaaaaaaaaaaaaaaaaaaaaa" -Body $pinturaPayload -Description "PUT 404 - ID inexistente" -ExpectedStatus 404

# ============================================
# 7. PUT 404 - ID mal formado
# ============================================
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/id-invalido" -Body $pinturaPayload -Description "PUT 404 - ID mal formado" -ExpectedStatus 404

# ============================================
# 8. PUT 422 - Body vacio
# ============================================
$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000001" }
Invoke-CurlTest -Method "PUT" -Url "$BaseUrl/artworks/$id" -Description "PUT 422 - Body vacio" -ExpectedStatus 422

# ============================================
# 9. DELETE 204 - obra existente
# ============================================
$id = if ($ArtworkId) { $ArtworkId } else { "000000000000000000000001" }
Invoke-CurlTest -Method "DELETE" -Url "$BaseUrl/artworks/$id" -Description "DELETE obra existente" -ExpectedStatus 204

# ============================================
# 10. DELETE 404 - ID inexistente
# ============================================
Invoke-CurlTest -Method "DELETE" -Url "$BaseUrl/artworks/aaaaaaaaaaaaaaaaaaaaaaaa" -Description "DELETE 404 - ID inexistente" -ExpectedStatus 404

# ============================================
# 11. DELETE 404 - ID mal formado
# ============================================
Invoke-CurlTest -Method "DELETE" -Url "$BaseUrl/artworks/id-invalido" -Description "DELETE 404 - ID mal formado" -ExpectedStatus 404

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  Pruebas completadas" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
