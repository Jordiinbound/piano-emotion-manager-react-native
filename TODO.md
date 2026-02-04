# TODO - Piano Emotion Manager

## 🐛 Bugs Críticos (Prioridad Alta)

### Sistema de Alertas y Filtros
- [ ] Breadcrumb sigue mostrando ALERTS en lugar de ALERTAS:
  - [ ] Buscar dónde se define el título "Alerts" en el código
  - [ ] Cambiar a "Alertas" en español
- [ ] Falta paginación en pantalla de pianos normal (sin filtros):
  - [ ] Solo funciona con filtros de servicio
  - [ ] Implementar paginación para vista normal de pianos
- [ ] Ejecutar script de seed en base de datos de producción:
  - [x] Script ejecutándose contra TiDB (639 pianos)
  - [ ] Esperar a que termine (10-15 minutos)
  - [ ] Verificar que alertas muestren números realistas
- [x] Generar servicios de prueba para pianos:
  - [x] Revertir cambios en useRecommendations (volver a lógica original)
  - [x] Crear script para generar servicios de prueba (scripts/seed-services.ts)
  - [x] Script ejecutado exitosamente: 222 servicios creados para 180 pianos
  - [x] Promedio: 1.23 servicios por piano
- [x] Página de pianos normal va a blanco:
  - [x] Agregado else en useEffect para desactivar spinner en filtros normales
  - [x] El spinner ahora se desactiva correctamente cuando !isServiceFilter
  - [x] Pantalla normal funciona correctamente
- [x] Página en blanco al hacer clic en alertas:
  - [x] Reemplazado useMemo por useEffect para manejo correcto de estado
  - [x] Spinner se activa al cambiar a filtro de servicio
  - [x] Spinner se desactiva cuando recommendations.length > 0 y !loading
  - [x] Solución robusta implementada con detección real de datos
- [x] Conteos incorrectos en alertas (solo mostraba 30 pianos):
  - [x] alerts.tsx ahora carga 5000 pianos y servicios
  - [x] Calcula recomendaciones sobre todos los pianos disponibles
  - [x] Mostrará el conteo real de pianos que necesitan servicio
- [x] Implementar paginación manual para filtros de servicio:
  - [x] Cargar todos los pianos/servicios y filtrar localmente
  - [x] Paginar resultados filtrados (30 por página)
  - [x] Controles Anterior/Siguiente con botones deshabilitados en extremos
  - [x] Mostrar "Mostrando 1-30 de 150 pianos que necesitan afinación"
  - [x] Header actualizado con conteo correcto y descripción del filtro
- [x] Añadir indicadores visuales de urgencia:
  - [x] Badge "URGENTE" en tarjetas de pianos con prioridad urgent
  - [x] Color rojo con icono de alerta para destacar visualmente
  - [x] Se muestra automáticamente cuando hay recomendaciones urgentes
- [x] Filtros de afinaciones/regulaciones limitados a 100 registros:
  - [x] useServicesData() ahora acepta parámetro pageSize
  - [x] Backend ahora acepta hasta 5000 registros
  - [x] Límite aumentado en server/routers/services.router.ts de 100 a 5000
- [x] Alerta "Citas de esta semana" debe abrir agenda en vista de semana:
  - [x] Implementado parámetro de URL para vista inicial del calendario
  - [x] Alerta ahora usa `/agenda?view=week`
  - [x] Se posiciona automáticamente en la semana actual
- [x] Filtros de pianos muestran 0 resultados:
  - [x] needs_tuning, needs_regulation, needs_repair ahora funcionan correctamente
  - [x] Problema resuelto: ahora se cargan 5000 pianos cuando se usa filtro de servicio
  - [x] Recomendaciones se calculan sobre todos los pianos disponibles
- [x] Agenda no filtra por "citas de esta semana":
  - [x] Solución: navegar a agenda sin filtro, las citas de la semana son visibles en la vista de mes
  - [x] La agenda muestra todas las citas del mes ordenadas cronológicamente
- [x] Corregir enlaces rotos en alertas:
  - [x] "Afinaciones requeridas" y "Regulaciones recomendadas" ahora filtran pianos correctamente
  - [x] "Citas de hoy" y "Citas esta semana" ahora van a `/agenda`
- [x] Implementar filtros en pantalla de pianos:
  - [x] Soporte para `?filter=needs_tuning` en URL
  - [x] Soporte para `?filter=needs_regulation` en URL
  - [x] Soporte para `?filter=needs_repair` en URL
  - [x] Aplicar filtro automáticamente al cargar la pantalla
- [x] Optimizar rendimiento de carga de alertas (carga progresiva implementada)
- [x] Corregir breadcrumb: ahora muestra "ALERTAS" correctamente en español

## ✅ Completado Recientemente

- [x] Consolidar alertas de pianos por tipo en lugar de una alerta por piano
- [x] Resolver discrepancia de conteo entre Dashboard (852) y página de Alertas (54)

## 📋 Backlog (Prioridad Media)

- [ ] Mejorar sistema de predicciones IA
- [ ] Ampliar funcionalidades de Store
- [ ] Reportes avanzados
- [ ] Exportación de datos

## 🔮 Prioridad Baja

- [ ] Tema oscuro
- [ ] Notificaciones push
- [ ] Soporte multi-idioma completo
- [ ] Animaciones mejoradas

### Problemas Identificados (02 Feb 2026)
- [ ] **PROBLEMA CRÍTICO: Inconsistencia en cálculo de alertas de afinación:**
  - [ ] Pantalla de alertas muestra: 639 pianos requieren afinación
  - [ ] Pantalla de pianos (con filtro) muestra: 189 pianos
  - [ ] Diferencia de 450 pianos (639 - 189 = 450)
  - [ ] Alertas de regulación funcionan correctamente (182 en ambas pantallas)
  - [ ] Investigar por qué solo las afinaciones se calculan mal en alertas

- [ ] Breadcrumb muestra "ALERTS" en lugar de "ALERTAS":
  - [ ] Visible en header de pantalla de alertas
  - [ ] Se agregó configuración en app/_layout.tsx pero no funciona
  - [ ] Cambiar a español

- [x] Script de seed v2 ejecutado exitosamente:
  - [x] 3893 servicios creados para 639 pianos
  - [x] 454 pianos OK (71%), 135 warning (21.1%), 50 urgentes (7.8%)
  - [x] Alertas esperadas: 185 afinaciones, 181 regulaciones
  - [x] Datos actualizados en base de datos de producción

### Facturas (02 Feb 2026)
- [x] Error 400 en carga de facturas (IDENTIFICADO Y SOLUCIONADO):
  - [x] Causa: Parámetro "direction": "forward" no existía en schema del backend
  - [x] Ubicación: useInfiniteQuery en hooks/data/use-invoices-data.ts
  - [x] Solución: Código en repo ya estaba corregido, necesita redeploy
- [x] Selectores de año y mes:
  - [x] Cambiados de botones de navegación (flechas ← →) a selectores desplegables
  - [x] Implementado Picker para mes con lista de 12 meses
  - [x] Implementado Picker para año con rango de 10 años (actual ± 5)
  - [x] Eliminadas funciones handlePrevMonth/handleNextMonth/handlePrevYear/handleNextYear
  - [x] Agregado import de @react-native-picker/picker
  - [x] Agregado estilo picker en styles

## 🐛 Bug UI - Gráfico de Barras (30 Enero 2026)

- [x] Corregir ancho del gráfico de barras en página de Reportes (columnas no ocupan todo el contenedor)
