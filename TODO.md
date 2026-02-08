# TODO - Piano Emotion Manager

## ✅ RESUELTO - Mejoras Visuales y Funcionales (08 Feb 2026)

### Toggle VIP en Detalle de Cliente
- [x] **IMPLEMENTADO:** Toggle para marcar clientes como VIP
- [x] **CARACTERÍSTICAS:**
  - Switch con colores personalizados (verde #52a67d cuando activo)
  - Feedback háptico al cambiar estado
  - Deshabilitado en modo vista, editable en modo edición
  - Descripción clara: "Marca este cliente como VIP para darle prioridad"
- [x] **COMMIT:** ab11c72 - "Feature: Agregar toggle VIP en página de detalle del cliente"
- [x] **ESTADO:** Desplegado en producción

### Selector de Ciudades de España
- [x] **IMPLEMENTADO:** Autocompletado de ciudades con 3,638 municipios
- [x] **CARACTERÍSTICAS:**
  - Componente CitySelector con datalist nativo HTML
  - Integrado en dirección fiscal y dirección de envío
  - Autocompletado nativo del navegador
  - Datos desde archivo JSON (assets/data/ciudades_espana.json)
- [x] **COMMIT:** ef9bf24 - "Feature: Agregar selector de ciudades de España con autocompletado"
- [x] **ESTADO:** Desplegado en producción

### Mejoras Visuales en Detalle de Cliente
- [x] **COLORES MATIZADOS:** Botones menos brillantes
  - WhatsApp: #52a67d (verde suave)
  - Cómo llegar: #5b7fc7 (azul suave)
  - Portal: #9b7fc9 (violeta suave)
- [x] **SOMBRAS:** Agregadas a todas las secciones contenedoras
  - shadowColor: '#000', shadowOffset: {width: 0, height: 4}
  - shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
- [x] **MARGEN:** Agregado marginRight: 16 al botón editar
- [x] **COMMIT:** b167702 - "UI: Mejoras visuales en página de detalle del cliente"
- [x] **ESTADO:** Desplegado en producción

### Sombras en Filtros de Clientes
- [x] **AJUSTADAS:** Sombras consistentes con inventario
  - shadowRadius: 8 (antes 12)
  - elevation: 5 (antes 6)
  - Agregado boxShadow para web
- [x] **COMMIT:** c94a059 - "UI: Ajustar sombras en filtros de clientes"
- [x] **ESTADO:** Desplegado en producción

## ✅ RESUELTO - Páginas en blanco (08 Feb 2026)

### Página de Clientes
- [x] **CAUSA:** Faltaba import de trpc en clients.tsx
- [x] **SOLUCIÓN:** Agregado `import { trpc } from '@/lib/trpc'` en línea 26
- [x] **COMMIT:** fa0329a - "Fix: Agregar import faltante de trpc en clients.tsx"
- [x] **ESTADO:** Desplegado en producción

### Página de Agenda
- [x] **CAUSA:** Navegación a ruta inexistente /appointment/[id]
- [x] **PROBLEMA:** Al hacer clic en días del calendario, eventos o botón FAB intentaba navegar a ruta que no existe
- [x] **SOLUCIÓN:** 
  - handleCalendarDatePress: ahora solo actualiza fecha seleccionada
  - handleCalendarEventPress: comentada navegación temporalmente
  - handleAppointmentPress: comentada navegación temporalmente
  - handleAddAppointment: comentada navegación temporalmente
  - Agregados TODOs para implementar cuando la ruta exista
- [x] **COMMIT:** c6f7a7e - "Fix: Corregir navegación a ruta inexistente en agenda"
- [x] **ESTADO:** Desplegado en producción

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

### Gráfico de Reportes - Formato de Moneda (04 Feb 2026)
- [x] **Mejora: Reducir espacio entre número y símbolo €**
  - [x] Antes: "25.0k €" (con espacio)
  - [x] Ahora: "25.0k€" (sin espacio)
  - [x] Ajustado en formatValue() de AnalyticsDashboard.tsx

### Grid de Métricas en Reportes (04 Feb 2026)
- [ ] **BUG: Grid pasa por 3 columnas en ancho intermedio**
  - [ ] En cierto ancho, las tarjetas se muestran en 3 columnas
  - [ ] Los porcentajes de cambio se cortan (↘6.7%, ↗87.5%)
  - [ ] Debe saltar directamente de 2 a 4 columnas
  - [ ] Ajustar breakpoints del grid

### Estilos de Página de Servicios (07 Feb 2026)
- [x] **Igualar estilos con página de Inventario:**
  - [x] Botones de filtros: fondo blanco con línea de color debajo (en lugar de azul sólido)
  - [x] Aumentado tamaño de botones: paddingVertical 6px → 12px
  - [x] Border radius actualizado: 8px (igual que Inventario)
  - [x] Tamaño de fuente: 13px → 15px
  - [x] Font weight: '500' → '600'
  - [x] Añadidas sombras consistentes a todos los elementos:
    - [x] Botones de filtros (filterChip)
    - [x] Cajas superiores con números (statCard)
    - [x] Tarjetas de servicios individuales (ServiceCard)
  - [x] Implementado indicador de línea inferior (filterIndicator) con posición absoluta

### Estilos de Página de Pianos (07 Feb 2026)
- [x] **Igualar estilos con página de Inventario:**
  - [x] Botones de filtros: fondo blanco con línea de color debajo (en lugar de azul sólido)
  - [x] Aumentar tamaño de botones de filtros
  - [x] Border radius actualizado: 8px (igual que Inventario)
  - [x] Tamaño de fuente: 15px, font weight: '600'
  - [x] Añadir sombras consistentes a:
    - [x] Botones de filtros (filterChip)
    - [x] Cajas superiores con números (statCard - Verticales, De Cola)
    - [x] Tarjetas de pianos individuales (PianoCard)
  - [x] Implementar indicador de línea inferior (filterIndicator) con posición absoluta
  - [x] Centrar botones de filtros

### Corrección de Color en Filtros (07 Feb 2026)
- [x] **Servicios: Cambiar color de filtros activos de azul a coral**
  - [x] Texto activo: COLORS.primary (#003a8c) → COLORS.accent (#e07a5f)
  - [x] Línea indicadora: COLORS.primary → COLORS.accent
- [x] **Pianos: Cambiar color de filtros activos de azul a coral**
  - [x] Texto activo: COLORS.primary (#003a8c) → COLORS.accent (#e07a5f)
  - [x] Línea indicadora: COLORS.primary → COLORS.accent

### Estilos y Filtros de Página de Clientes (07 Feb 2026)
- [x] **Añadir sombras consistentes:**
  - [x] Cajas superiores (359 TOTAL, 359 ACTIVOS, 0 VIP, 334 CON PIANOS)
  - [x] Cajas de filtros desplegables (COMUNIDAD, CIUDAD, GRUPO DE RUTA)
- [x] **Corregir filtros de ubicación:**
  - [x] Cambiar "COMUNIDAD" por "PROVINCIA"
  - [x] Mostrar todas las 50 provincias españolas (no solo las que tienen clientes)
  - [x] Mostrar todas las ciudades españolas principales (52 ciudades)
  - [x] Ordenar alfabéticamente
  - [x] Corregir comparación de filtros (c.address?.province y c.address?.city)

### Sistema de Gestión de Rutas (07 Feb 2026)

#### Fase 1: Configuración Básica (CRUD) ✅ COMPLETADA
- [x] Cambiar "GRUPO DE RUTA" → "RUTA" en página de clientes
- [x] Crear tabla `routes` en base de datos:
  - [x] id, name, color, description, preferredDay, preferredTime
  - [x] createdAt, updatedAt, displayOrder, isActive, partnerId, organizationId
- [x] Crear router backend `routes.router.ts`:
  - [x] list, getById, create, update, delete, getStats
- [x] Registrar router en `server/routers.ts` y `server/routers/index.ts`
- [x] Crear página `/settings/routes-settings.tsx`:
  - [x] Lista de rutas con colores y estadísticas
  - [x] Modal crear/editar ruta con todos los campos
  - [x] Selector de colores predefinidos (15 colores)
  - [x] Selectores de día y hora preferente
  - [x] Botón eliminar con confirmación y aviso de clientes asignados
  - [x] Diseño responsive (móvil/tablet/desktop)
  - [ ] Drag & drop para reordenar (opcional - futuro)

#### Fase 2: Asignación y Estadísticas 🔄 EN PROGRESO
- [x] Añadir campo `routeId` a tabla `clients` en schema
- [ ] Migración de datos: convertir routeGroup string → routeId (ejecutar en BD)
- [ ] Actualizar página de detalle de cliente `/app/client/[id].tsx`:
  - [ ] Añadir selector de ruta (dropdown con colores)
  - [ ] Guardar routeId al actualizar cliente
  - [ ] Mostrar ruta actual con color
- [x] Actualizar filtro en página de clientes:
  - [x] Cargar rutas desde BD con trpc.routes.list.useQuery()
  - [ ] Mostrar colores en selector (opcional)
- [x] Estadísticas por ruta en `/settings/routes-settings.tsx`:
  - [x] Número de clientes asignados (ya implementado)
  - [ ] Número de pianos en la ruta (requiere query adicional)
  - [ ] Próximas citas programadas (requiere query adicional)

#### Fase 3: Mapas y Optimización ✅ COMPLETADA
- [x] Crear página `/routes/[id]/map.tsx`:
  - [x] Estructura completa con header, stats, lista de clientes
  - [x] Placeholder para Google Maps (integración futura)
  - [x] Indicadores de clientes con/sin ubicación
  - [x] Click en cliente para ir a detalle
  - [x] Botón de mapa en tarjetas de rutas en configuración
- [ ] Optimización de orden (futuro):
  - [ ] Algoritmo para ordenar clientes por proximidad (TSP)
  - [ ] Botón "Optimizar ruta" en página de mapa
  - [ ] Guardar orden optimizado
- [x] Exportación a PDF:
  - [x] Lista de clientes ordenados con direcciones
  - [x] Tabla HTML profesional con estilos
  - [x] Estadísticas de la ruta (total, con/sin ubicación)
  - [x] Botón de exportación en página de mapa
  - [x] Compartir PDF generado
  - [ ] Mapa estático con marcadores (requiere Google Maps API)
  - [ ] Tiempo estimado de desplazamiento (requiere Directions API)
  - [ ] Distancia total de la ruta (requiere Directions API)


### Mejoras Avanzadas del Sistema de Rutas (07 Feb 2026) ✅ COMPLETADAS

#### 1. Migración de Datos ✅
- [x] Crear endpoint de migración en backend (migrate-routes.router.ts)
- [x] Procedimiento migrateData que convierte routeGroup → routeId
- [ ] Ejecutar migración en BD de producción (manual)

#### 2. Estadísticas Avanzadas ✅
- [x] Añadir query para contar pianos por ruta (routes.router.ts getStats)
- [x] Añadir query para próximas citas por ruta (routes.router.ts getStats)
- [x] Actualizar página de configuración con iconos de pianos y citas
- [x] Mostrar estadísticas en página de mapa (distancia y tiempo cuando optimizado)

#### 3. Integración Google Maps ✅
- [x] Añadir react-native-maps en página de mapa
- [x] Mostrar markers de clientes con coordenadas
- [x] Colores de markers según estado (VIP = dorado #FFD700, otros = color ruta)
- [x] Callout al click en marker con nombre y dirección
- [x] Auto-zoom con fitToCoordinates para mostrar todos los markers
- [x] Click en callout para ir a detalle de cliente

#### 4. Optimización de Ruta (TSP) ✅
- [x] Implementar algoritmo nearest neighbor (utils/route-optimizer.ts)
- [x] Botón "Optimizar ruta" en página de mapa
- [x] Reordenar lista de clientes según optimización
- [x] Botón "Restablecer orden" para volver al original
- [x] Haptic feedback en optimización
- [x] Alert con resumen de distancia y tiempo

#### 5. Cálculo de Distancias y Tiempo ✅
- [x] Cálculo de distancia con fórmula de Haversine
- [x] Calcular distancia total de la ruta (calculateTotalDistance)
- [x] Calcular tiempo estimado (estimateTravelTime - 40 km/h promedio)
- [x] Formateo de tiempo (formatTravelTime - "2h 30min")
- [x] Mostrar en estadísticas de mapa cuando está optimizado
- [x] Incluir en alert de optimización


### Correcciones Urgentes - Página de Clientes (07 Feb 2026)
- [ ] **Añadir sombras a filtros desplegables:**
  - [ ] filterSelect (PROVINCIA, CIUDAD, RUTA) sin sombras
  - [ ] Aplicar sombras consistentes: shadowOffset height 4, opacity 0.15, radius 12, elevation 6
- [ ] **Ampliar lista de ciudades españolas:**
  - [ ] Actualmente solo 52 ciudades
  - [ ] Ampliar a 200+ ciudades principales de España
  - [ ] Incluir todas las capitales de provincia
  - [ ] Incluir ciudades con más de 50,000 habitantes
  - [ ] Ordenar alfabéticamente

### Pasos Opcionales del Sistema de Rutas (07 Feb 2026)
- [ ] **Persistencia de orden optimizado:**
  - [ ] Añadir campo `displayOrder` a tabla `clients`
  - [ ] Guardar orden después de optimizar
  - [ ] Cargar orden guardado al abrir mapa
  - [ ] Botón para restablecer a orden original
- [ ] **Integración Google Directions API:**
  - [ ] Crear servicio de Directions API
  - [ ] Calcular ruta real entre puntos (no línea recta)
  - [ ] Obtener distancia y tiempo real
  - [ ] Dibujar polyline en mapa
  - [ ] Mostrar instrucciones de navegación
- [ ] **Tiempo de servicio por cliente:**
  - [ ] Añadir campo `estimatedServiceTime` a clientes
  - [ ] Input en detalle de cliente (minutos)
  - [ ] Sumar tiempo de servicio + tiempo de desplazamiento
  - [ ] Mostrar tiempo total estimado en mapa
- [ ] **Drag & drop para reordenar rutas:**
  - [ ] Instalar react-native-draggable-flatlist
  - [ ] Implementar en página de configuración
  - [ ] Guardar orden en campo `displayOrder`
  - [ ] Actualizar orden en BD al soltar
- [ ] **Ejecutar migración de datos:**
  - [ ] Llamar a trpc.migrateRoutes.migrateData()
  - [ ] Verificar que todos los clientes tienen routeId
  - [ ] Eliminar campo routeGroup (opcional)


### Corrección de Mapas para Web (07 Feb 2026) ✅ COMPLETADA
- [x] Hacer react-native-maps condicional (solo para iOS/Android)
- [x] Instalar @react-google-maps/api (compatible con web)
- [x] Import condicional basado en Platform.OS
- [x] Mantener toda la funcionalidad:
  - [x] Markers de clientes con colores personalizados
  - [x] Callouts con información
  - [x] Auto-zoom para mostrar todos los markers
  - [x] Optimización TSP
  - [x] Estadísticas de distancia y tiempo
  - [x] Exportación PDF

**Nota:** En web, el mapa no se mostrará hasta que se implemente la versión web con @react-google-maps/api. Por ahora, la app funciona en web sin errores de compilación.

### Implementación Web Completa del Mapa (07 Feb 2026) ✅ COMPLETADA
- [x] Crear componente WebMapView con @react-google-maps/api
- [x] Implementar markers personalizados para web (colores VIP/ruta)
- [x] Implementar InfoWindow para callouts con información de cliente
- [x] Auto-zoom con fitBounds para mostrar todos los markers
- [x] Integrar en map.tsx con renderizado condicional (Platform.OS === 'web')
- [ ] Configurar EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en variables de entorno (Vercel)

**Nota:** El mapa ahora funciona completamente en web. Solo falta configurar la API key de Google Maps en Vercel.

### Traducciones Faltantes en Clientes (08 Feb 2026)
- [ ] Agregar traducción "es.clients.empty" en locales/es/translations.json
- [ ] Agregar traducción "es.clients.emptyMessage" en locales/es/translations.json

### Problemas Post-Fix de Páginas en Blanco (08 Feb 2026)
- [x] **Clientes no se cargan en página de clientes** - RESUELTO
  - CAUSA: Columna `route_id` no existe en tabla `clients`
  - Error SQL: Unknown column 'clients.route_id' in 'field list'
  - Solución: Comentada línea `routeId: int('route_id')` en drizzle/schema.ts
  - Commit: 1350658 - "Fix: Comentar routeId en esquema de clients"
  - Estado: Desplegado en producción
- [x] **"Cliente desconocido" en agenda** - Se resolverá automáticamente al cargar clientes
- [x] **Faltan sombras en calendario** - RESUELTO: Agregadas sombras al contenedor del calendario
- [x] **Faltan sombras en tarjetas de citas** - RESUELTO: Agregadas sombras a appointmentCard
- [x] **Falta spinner de carga en agenda** - RESUELTO: Agregado ActivityIndicator con mensaje "Cargando citas..."

### Crear estructuras faltantes en TiDB (08 Feb 2026)
- [x] Verificar esquema actual de tabla clients
- [x] Crear tabla routes en TiDB - Tabla creada con todos los campos e índices
- [x] Agregar columna route_id a tabla clients - Columna agregada correctamente
- [x] Descomentar routeId en drizzle/schema.ts - Esquema actualizado

### Fortalecer sombras en UI (08 Feb 2026)
- [x] Actualizar sombras del calendario - Aumentada opacidad a 0.15, offset a 4, radius a 8, elevation a 5
- [x] Actualizar sombras de tarjetas de citas - Aumentada opacidad a 0.15, offset a 4, radius a 8, elevation a 5

### Agregar sombras a filtros de clientes (08 Feb 2026)
- [x] Agregar sombras a selectores de filtros (PROVINCIA, CIUDAD, RUTA) - Agregado boxShadow para web

### ✅ RESUELTO: Clientes sin pianos (08 Feb 2026)
- [x] Identificar los 25 clientes que no tienen pianos asignados - IDs 1-25
- [x] Investigar por qué estos clientes no tienen pianos - Error de importación: pianos empezaban desde clientId 26
- [x] Verificar si es error de importación de datos - Confirmado: 290 citas existían para estos clientes
- [x] Corregir el problema - Creados 44 pianos (5 para instituciones, 1 para individuales)
- [x] Resultado: 359/359 clientes ahora tienen pianos (100%)

### Agregar TODAS las ciudades de España (08 Feb 2026)
- [x] Consultar qué ciudades existen actualmente - 10 ciudades encontradas
- [x] Obtener lista completa de TODAS las ciudades de España - 3,638 municipios únicos descargados
- [ ] Preparar script SQL para insertar todas las ciudades
- [ ] Ejecutar inserción en base de datos

### Funcionalidad VIP para clientes (08 Feb 2026)
- [x] Verificar cómo se calcula la estadística "VIP" en el frontend - Hardcodeado a 0
- [x] Agregar campo isVip a la tabla clients en TiDB - Completado
- [x] Actualizar esquema de Drizzle con el campo isVip - Completado
- [x] Actualizar router para calcular correctamente el conteo de VIP - Completado
- [x] Buscar/crear página de detalle de cliente - app/client/[id].tsx
- [x] Agregar margen al botón editar en página de detalle - Completado
- [x] Matizar colores de botones (Llamar, WhatsApp, Cómo llegar, Email, Portal) - Aplicados colores suaves del dashboard:
  - WhatsApp: #52a67d (verde suave)
  - Cómo llegar: #5b7fc7 (azul suave)
  - Portal: #9b7fc9 (violeta suave)
- [x] Aplicar sombras a las cajas contenedoras (secciones) como en inventario - Aplicadas sombras idénticas:
  - shadowRadius: 12, shadowOpacity: 0.15, elevation: 6
- [ ] Agregar toggle/checkbox de VIP en la interfaz de detalle del cliente
- [ ] Implementar tRPC mutation para actualizar isVip
- [ ] Probar que la funcionalidad VIP funcione correctamente

### Implementar archivo JSON de ciudades (08 Feb 2026)
- [ ] Crear archivo JSON con las 3,638 ciudades de España
- [ ] Agregar el archivo al proyecto React Native
- [ ] Actualizar componente de filtros para cargar ciudades desde JSON
- [ ] Probar que el selector de ciudades funcione correctamente

## 🎨 Mejoras Visuales Pendientes (08 Feb 2026)

- [x] Agregar sombras a botones de acción en detalle de cliente (Llamar, Email, WhatsApp, Cómo llegar, Portal)
- [x] Agregar spinner de carga mientras se cargan los datos del cliente
- [x] Cambiar selector de ciudades a dropdown nativo <select> con todas las 3,638 ciudades

## 🐛 Bugs Identificados (08 Feb 2026)

- [x] Agregar indicador VIP en detalle de piano (badge verde "VIP" junto al nombre del cliente)
- [x] Campo VIP no se guardaba en creación de cliente (corregido - agregado isVip a addClient)
- [ ] Faltan 25 clientes sin pianos (334/359 tienen pianos, deberían ser 359/359)

## 🐛 Bugs Nuevos (08 Feb 2026)

- [x] Spinner de carga no aparece en detalle de cliente (corregido - agregado delay de 300ms)

- [x] Calendario: Las tarjetas de citas no responden al clic (corregido - habilitada navegación a /appointment/[id])
- [x] Calendario: Eventos en el calendario no abren detalle (corregido - habilitada navegación)
- [x] Calendario: Cambio de día funciona correctamente (setSelectedDate ya estaba implementado)

- [x] Timeout al conectar Google/Outlook Calendar - Correcciones aplicadas:
  - maxDuration aumentado de 10s a 30s en vercel.json
  - Validación temprana de variables de entorno en endpoints
  - Mensajes de error claros si faltan credenciales OAuth

- [x] Aviso "Sin Conexión" actualizado a diseño moderno (cardBg con sombras)
- [x] Icono de Google Calendar corregido (calendar.badge.clock)
- [x] Icono de Outlook Calendar corregido (calendar.circle)

- [x] Icono de Outlook Calendar corregido (cambiado a 'calendar' simple que sí existe)

- [x] Contenedor de "Conexiones" y "Sincronización" ahora tienen sombras

- [x] Usar mismo icono para Google y Outlook Calendar (calendar.badge.clock para ambos)

- [ ] Calendario: Los días no responden al clic (no se puede cambiar de día seleccionado)
