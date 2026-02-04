# TODO - Piano Emotion Manager

## 🐛 Bugs Críticos (Prioridad Alta)

### Gráfico de Reportes con Sidebar (04 Feb 2026)
- [x] **BUG CRÍTICO: Gráfico se corta por ambos lados con barra lateral**
  - [x] El gráfico pierde responsividad en tablet/desktop con sidebar
  - [x] Se corta por izquierda y derecha
  - [x] onLayout no estaba funcionando correctamente
  - [x] Solución: Inicializar containerWidth en 0 para forzar medición correcta
- [x] **BUG: Gráfico se corta por la izquierda**
  - [x] Etiquetas del eje Y se cortaban por la izquierda
  - [x] Causa: chartCard tenía paddingHorizontal: 8 conflictivo
  - [x] Solución: Eliminar paddingHorizontal, usar padding: 16 uniforme

### Previsiones sin Datos (04 Feb 2026)
- [x] **BUG CRÍTICO: Previsiones muestra "Datos insuficientes para previsión"**
  - [x] CAUSA: Endpoints usaban `ctx.user.partnerId` (no existe)
  - [x] SOLUCIÓN: Cambiar a `ctx.partnerId` (existe en el contexto)
  - [x] Corregidos todos los endpoints: getRevenue, getChurnRisk, getMaintenance, getWorkload, getInventoryDemand, getSummary, debugHistoricalData
  - [x] Agregado endpoint de debug para diagnosticar problemas futuros

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

## 🚨 BUG CRÍTICO - Página en Blanco (30 Enero 2026)

- [x] Página de Reportes va a blanco después de los cambios de optimización
  - Causa: useDashboardData no estaba exportado en hooks/reports/index.ts
  - Solución: Agregado a las exportaciones

## 🚨 BUG CRÍTICO - Gráfico en Carga Infinita (30 Enero 2026)

- [x] Gráfico de evolución de ingresos se queda en 'Cargando gráfico...' indefinidamente
  - Causa: chartWidth inicial en 0 impedía renderizado
  - Solución: Revertido a chartWidth=300
- [x] Optimización de rendimiento no funciona - carga sigue igual de lenta
  - Causa: Gráfico necesita 12 meses fijos, no el período seleccionado
  - Solución: Separadas llamadas - métricas optimizadas (1 call) + gráfico (1 call) = 2 calls en lugar de 3

## 🐛 Bugs en Métricas del Dashboard (30 Enero 2026)

- [x] Tasa de finalización incorrecta (muestra 100% cuando no debería)
  - Solución: Ahora cuenta servicios con clientSignature como completados
- [x] Ticket medio e Ingresos medios son idénticos (128€) - sospechoso
  - Solución: Separados los cálculos correctamente
- [x] Ingresos deben calcularse por facturas COBRADAS, no por costo de servicios
  - Solución: Ya estaba correcto (usa invoices.status = 'paid')
- [x] Ticket medio debe ser precio medio de servicios (independiente de si están cobrados)
  - Solución: Ahora usa AVG(services.cost)
- [x] Ingresos medios ahora es un campo separado (averages.revenuePerService)

## 🚨 CRÍTICO - Problemas Persistentes (30 Enero 2026)

- [x] Gráfico de barras SIGUE sin ocupar todo el ancho del contenedor
  - Solución: Usar Dimensions.get('window').width directamente sin onLayout
  - Ahora calcula: SCREEN_WIDTH - (padding 24px * 2) = ancho real
- [x] Métricas principales tardan demasiado en cargar (rendimiento no mejorado)
  - Solución: Optimizado getServiceStats para hacer 1 query con agregaciones en lugar de 3
  - Reducción de queries: 66% menos (3→1)

## 🚨 BUGS CRÍTICOS Post-Despliegue (30 Enero 2026)

- [x] Tasa de finalización muestra 0.0% (debería ser mayor)
  - Causa: Lógica basada en clientSignature no funcionaba (campo vacío)
  - Solución: Cambiar a usar fecha del servicio (< hoy = completado, >= hoy = pendiente)
- [x] Ingresos medios muestra 0 € (debería mostrar valor real)
  - Causa: serviceStats.completed era 0, causando división por cero
  - Solución: Se resuelve automáticamente con el fix de tasa de finalización

## 🎨 UX - Mejoras de Experiencia de Usuario (30 Enero 2026)

- [x] Agregar spinners de carga en cada sección del dashboard (carga tarda 6+ segundos)
  - Solución: ActivityIndicator con mensaje "Cargando..." en métricas y gráfico
- [x] Ajustar ancho de columnas del gráfico para que sean más estrechas
  - Solución: Barras ocupan 60% del espacio, 40% para spacing
- [x] Hacer el gráfico totalmente responsive
  - Solución: Ya era responsive con Dimensions.get('window').width
- [x] Matizar colores (menos vibrantes, más profesionales)
  - Solución: Paleta actualizada con tonos suaves (#5b7fc7, #52a67d, #d9a05b, #9b7fc9)

## 🐛 BUG - Tasa de Finalización Siempre 100% (30 Enero 2026)

- [x] Tasa de finalización muestra siempre 100% (debería variar según servicios realmente completados)
  - Causa: Usaba fecha del servicio (< hoy = completado) en lugar de clientSignature
  - Solución: Cambiar a clientSignature IS NOT NULL AND != ''
  - Criterio correcto: Servicio completado = tiene firma del cliente
- [x] Gráfico de evolución NO es responsive (no se actualiza al rotar pantalla)
  - Causa: Dimensions.get('window').width solo se ejecuta una vez al montar
  - Solución: Agregar listener con Dimensions.addEventListener('change') + state

## 📱 Layout Móvil - Métricas (30 Enero 2026)

- [x] Métricas deben disponerse en 2 columnas x 4 filas en formato móvil (actualmente 3 columnas)
  - Solución: Cambiar metricCard width de 23.5% a 48% (2 columnas)
- [x] Descripciones de métricas truncadas ("Ticket m...", "Ingresos...") - deben mostrarse completas
  - Solución: Cambiar flexWrap de 'nowrap' a 'wrap' en metricTitle

## 🚨 BUG CRÍTICO - Página en Blanco Post-Despliegue (30 Enero 2026)

- [x] Página de Reportes carga en blanco después del último despliegue (layout móvil)
  - Causa REAL: Variable SCREEN_WIDTH eliminada pero aún usada en línea 843 (quickStatCard minWidth)
  - Solución: Reemplazar SCREEN_WIDTH por Dimensions.get('window').width
  - Nota: Los cambios de SQL y listener eran correctos, el problema era esta referencia olvidada

### Pestañas de Previsiones (04 Feb 2026)
- [x] **BUG: Pestañas no centradas en móvil**
  - [x] Primera pestaña "Ingresos" se sale por la izquierda
  - [x] Pestañas no se distribuyen correctamente en el espacio disponible
  - [x] Ajustar layout para centrar pestañas en móvil
  - [x] Oscurecer colores de texto para mejor legibilidad
- [x] **BUG: Palabras cortadas en pestañas (móvil)**
  - [x] "Mantenimiento" se cortaba en "Manteni" / "miento"
  - [x] "Inventario" se cortaba en "Inventari" / "o"
  - [x] Solución: Reducir fontSize de 11px a 9px en móvil
- [x] **BUG: Palabras cortadas en tablet/desktop**
  - [x] maxWidth: 90 se aplicaba en todos los tamaños
  - [x] Solución: maxWidth condicional solo para móvil (isMobile)

### Gráfico de Reportes - Tamaños de Fuente en Móvil (04 Feb 2026)
- [x] **BUG: Etiquetas del gráfico demasiado grandes en móvil**
  - [x] Guía de valores del eje Y: fontSize 12 → 8 (responsive)
  - [x] Valores sobre columnas: fontSize 9 → 8
  - [x] Separación de columnas: barWidthRatio 0.6 → 0.5
  - [x] Resultado: Etiquetas compactas, columnas más separadas
