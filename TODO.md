# TODO - Piano Emotion Manager

## 🐛 Bugs Críticos (Prioridad Alta)

### Sistema de Alertas y Filtros
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
