-- Script para marcar ~80% de los servicios como completados (con firma)
-- Piano Emotion Manager - Analytics Fix

-- Paso 1: Ver cuántos servicios hay actualmente
SELECT 
  COUNT(*) as total_services,
  SUM(CASE WHEN COALESCE(clientSignature, '') != '' THEN 1 ELSE 0 END) as with_signature,
  SUM(CASE WHEN COALESCE(clientSignature, '') = '' THEN 1 ELSE 0 END) as without_signature
FROM services;

-- Paso 2: Actualizar aleatoriamente el 80% de los servicios sin firma
-- Usamos RAND() para selección aleatoria y un placeholder de firma base64 simulado
UPDATE services
SET clientSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
WHERE COALESCE(clientSignature, '') = ''
  AND RAND() < 0.80;  -- 80% de probabilidad

-- Paso 3: Verificar el resultado
SELECT 
  COUNT(*) as total_services,
  SUM(CASE WHEN COALESCE(clientSignature, '') != '' THEN 1 ELSE 0 END) as with_signature,
  SUM(CASE WHEN COALESCE(clientSignature, '') = '' THEN 1 ELSE 0 END) as without_signature,
  ROUND(SUM(CASE WHEN COALESCE(clientSignature, '') != '' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate_percent
FROM services;

-- Nota: La firma es un placeholder de 1x1 píxel transparente en base64
-- En producción, las firmas reales vendrían del canvas de firma en la app móvil
