# Piano Tech Manager - TODO

## Configuración Inicial
- [x] Configurar tema de colores personalizado
- [x] Generar logo/icono de la aplicación
- [x] Configurar navegación por tabs

## Gestión de Clientes
- [x] Pantalla de lista de clientes
- [x] Formulario para agregar/editar cliente
- [x] Pantalla de detalle de cliente
- [x] Búsqueda de clientes
- [x] Eliminar cliente con confirmación

## Gestión de Pianos
- [x] Pantalla de lista de pianos
- [x] Formulario para agregar/editar piano
- [x] Pantalla de detalle de piano
- [x] Filtros por marca/tipo
- [x] Asociación piano-cliente

## Gestión de Servicios
- [x] Pantalla de lista de servicios
- [x] Formulario para registrar nuevo servicio
- [x] Pantalla de detalle de servicio
- [x] Checklist de tareas por servicio
- [x] Filtros por fecha/tipo

## Sistema de Recomendaciones
- [x] Lógica de cálculo de recomendaciones
- [x] Alertas de mantenimiento pendiente
- [x] Pantalla de recomendaciones por piano

## Dashboard (Home)
- [x] Resumen de actividad
- [x] Próximos servicios
- [x] Alertas de mantenimiento
- [x] Estadísticas rápidas

## Almacenamiento Local
- [x] Hook personalizado para AsyncStorage
- [x] Persistencia de clientes
- [x] Persistencia de pianos
- [x] Persistencia de servicios

## UI/UX
- [x] Componentes reutilizables (Cards, etc.)
- [x] Estados vacíos con ilustraciones
- [x] Feedback háptico en acciones
- [x] Pull-to-refresh donde aplique

## Flujo de Trabajo del Técnico
- [x] Afinación como servicio principal (2 veces al año)
- [x] Reparación cuando piano no está en condiciones para afinar
- [x] Proponer regulaciones periódicamente
- [x] Indicador de estado del piano (afinable/requiere reparación)
- [x] Niveles de mantenimiento: Básico, Completo y Premium
- [x] Tipos de cliente: Particular, Estudiante, Profesional, Escuela, Conservatorio, Sala de conciertos

## Sistema de Recordatorios
- [x] Recordatorios de seguimiento (clientes con mantenimiento)
- [x] Recordatorios de captación (clientes sin servicios activos)
- [x] Tipos de contacto: llamar, visitar, mensaje/email
- [x] Pantalla de recordatorios pendientes

## Tipos de Piano Acústico
- [x] Verticales: Espineta, Consola, Estudio, Profesional
- [x] De Cola: Colín, Media cola, 3/4 cola, Gran cola de concierto

## Gestión de Almacén/Inventario
- [x] Catálogo de materiales y repuestos
- [x] Control de stock (cantidad disponible)
- [x] Stock mínimo por material
- [x] Alertas de reposición (stock bajo)
- [x] Historial de uso de materiales en servicios
- [x] Pantalla de inventario

## Módulo de Marketing
- [x] Campañas de mensajes (masivos e individuales)
- [x] Canales: WhatsApp y Email
- [x] Plantillas de mensajes predefinidas
- [x] Programación de envíos
- [x] Historial de mensajes enviados
- [x] Segmentación de clientes por tipo

## Diseño Multiplataforma
- [x] Diseño responsive para móvil, tablet y ordenador
- [x] Layout adaptativo según tamaño de pantalla
- [x] Navegación lateral en pantallas grandes

## Gestión de Negocio
- [x] Facturación: Generar facturas/presupuestos en PDF
- [x] Estadísticas e informes: Ingresos, servicios frecuentes, clientes activos
- [x] Agenda/Calendario: Programar citas y disponibilidad

## Documentación Técnica
- [x] Fichas técnicas de pianos con fotos y mediciones
- [x] Informes de inspección para el cliente
- [x] Historial fotográfico del piano

## Operativa Diaria
- [x] Rutas de trabajo optimizadas por ubicación
- [x] Checklist de herramientas antes de salir
- [x] Registro de tiempo de servicio
- [x] Estimación de duración de trabajos

## Comunicación con Cliente
- [x] Firma digital del cliente
- [x] Fotos antes/después del servicio
- [x] Envío de informes por email/WhatsApp

## Importación de Datos
- [x] Importar clientes desde Excel/CSV
- [x] Importar pianos desde Excel/CSV
- [x] Importar historial de servicios desde Excel/CSV
- [x] Plantillas de importación descargables
- [x] Validación de datos importados


## Facturación PDF y Envío por Email
- [x] Crear tipos para factura (Invoice)
- [x] Componente de generación de PDF de factura
- [x] Pantalla de previsualización de factura
- [x] Configuración de datos fiscales del técnico
- [x] Integración de envío por email
- [x] Historial de facturas emitidas

## Catálogo de Servicios y Tarifas
- [x] Tipos para catálogo de servicios (ServiceCatalog)
- [x] Hook para gestión del catálogo
- [x] Pantalla de listado de servicios y tarifas
- [x] Formulario para añadir/editar tarifas
- [x] Integración con facturación (seleccionar del catálogo)


## Sincronización y Despliegue
- [x] Activar sincronización con base de datos en la nube
- [x] Migrar hooks de AsyncStorage a tRPC/base de datos
- [x] Documentar proceso de despliegue en Vercel


## Firma Digital y Panel de Control
- [x] Componente de firma digital táctil
- [x] Integración de firma en órdenes de trabajo/servicios
- [x] Guardar firma como imagen base64
- [x] Panel de control con estadísticas clave
- [x] Gráficos de ingresos mensuales
- [x] Métricas de servicios y clientes


## Configuración PWA
- [x] Configurar manifest.json para PWA
- [x] Configurar exportación web estática
- [x] Guía de despliegue en Vercel paso a paso


## Bugs
- [x] Corregir visualización de módulos en móvil (aparece código en lugar de nombres)

- [x] Cambiar nombre de la app a "Piano Emotion Manager"

- [x] Actualizar logo con imagen proporcionada por el usuario

- [x] Añadir logo del piano en el header del Dashboard

- [x] Convertir secciones del Dashboard en acordeones colapsables

- [x] Mostrar Acciones Rápidas en una sola fila horizontal (3 columnas)

- [x] Centrar Acciones Rápidas en el acordeón

- [x] Restaurar módulos faltantes en la sección Módulos

- [x] Añadir efecto de zoom en hover para módulos

- [x] Añadir módulo de Clientes y Pianos en la sección Módulos

- [x] Añadir más espacio superior al título del Dashboard

## Módulo de Proveedores
- [x] Crear tipos para Proveedor (Supplier)
- [x] Crear hook para gestión de proveedores
- [x] Crear pantalla de lista de proveedores
- [x] Crear pantalla de detalle/edición de proveedor
- [x] Añadir módulo en el Dashboard

## Vinculación Inventario-Proveedores
- [x] Añadir campo supplierId en el tipo InventoryItem
- [x] Actualizar pantalla de inventario para mostrar proveedor
- [x] Actualizar formulario de material para seleccionar proveedor
- [ ] Mostrar botón de contacto rápido al proveedor


## Asociación Inventario-Servicios-Facturas
- [x] Añadir sección de materiales usados en el formulario de servicio
- [x] Descontar automáticamente del stock al guardar servicio
- [x] Mostrar materiales usados en el detalle del servicio
- [ ] Incluir materiales como conceptos en la factura
- [x] Calcular coste de materiales en cada servicio


## Mejoras Visuales
- [x] Centrar contenido para visualización en ordenador
- [x] Implementar fuente Arkhip en toda la aplicación


## Animaciones
- [x] Animación de carga para Proveedores
- [x] Animación de carga para Inventario

## Corrección de Fuente
- [x] Corregir implementación de fuente (cambiada a Montserrat)
- [x] Solucionar problemas con acentos y caracteres especiales

## Diseño Visual
- [x] Restaurar degradado de fondo elegante en escritorio
- [x] Aplicar degradado de fondo en versión móvil

## Fuentes Personalizadas
- [x] Aplicar fuente Arkhip en título de la aplicación
- [x] Asegurar fuentes funcionan correctamente en móvil
- [x] Corregir degradado para versión móvil

## Corrección Fuentes Móvil
- [x] Corregir carga de fuentes en dispositivo móvil real (Expo Go)

## Mejoras Visuales Interfaz Principal
- [x] Degradado cálido con tonos dorados
- [x] Iconos de colores en acordeones
- [x] Barra de estadísticas visual con tarjetas de colores
- [x] Header con degradado
- [x] Badges de colores en módulos con actividad pendiente

## Ajustes Header
- [x] Cambiar color fondo header a tono dorado/bronce elegante
- [x] Texto e icono blancos
- [x] Aumentar tamaño del icono (40px con contenedor)
- [x] Restaurar icono original (imagen) pero más grande (65px)
- [x] Cambiar degradado a tonos suaves (gris cálido/marrón topo)
- [x] Hacer icono del piano blanco
- [x] Aumentar tamaño del icono (75px)
- [x] Cambiar degradado a azul grisáceo suave
- [x] Aumentar más el tamaño del icono (85px)
- [x] Ajuste final del tamaño del icono (95px)
- [x] Aplicar cambios de diseño a versión desktop
- [x] Restaurar degradado sutil azul claro de fondo
- [x] Arreglar icono blanco para versión web
- [x] Aumentar tamaño del título en versión web

## Animaciones Extendidas
- [x] Extender LoadingSpinner a Clientes
- [x] Extender LoadingSpinner a Pianos
- [x] Extender LoadingSpinner a Servicios
- [x] Añadir animación pull-to-refresh
- [x] Personalizar mensajes de carga contextuales

## Mejoras UX Avanzadas
- [x] Crear componente de animación de guardado (overlay)
- [x] Implementar skeleton loading para listas
- [x] Añadir feedback háptico en acciones exitosas
- [ ] Integrar en formularios de creación/edición

## Header Unificado
- [x] Extender header con degradado a Clientes
- [x] Extender header con degradado a Pianos
- [x] Extender header con degradado a Servicios
- [x] Extender header con degradado a Agenda
- [x] Añadir sombra sutil al header

## Correcciones Urgentes
- [x] Restaurar degradado de fondo general en Dashboard
- [x] Aplicar cambios en versión móvil (limpiar caché)

## Sistema de Versionado y Migraciones
- [x] Crear sistema de versionado de datos
- [x] Implementar migraciones automáticas
- [x] Integrar con hooks de almacenamiento existentes

## Bug Degradado Intermitente
- [x] Corregir degradado de fondo intermitente en desktop (usando CSS gradient nativo en web)

## Documentación y Marketing
- [x] Texto de presentación marketiniano
- [x] Manual de instalación móvil y desktop
- [x] Manual de instrucciones de uso
- [x] Pantalla de ayuda integrada en la app
- [x] Sistema de copia de seguridad en la app

## Campos de Facturación en Clientes
- [x] Actualizar tipo Client con campos: firstName, lastName1, lastName2, taxId (NIF/CIF)
- [x] Añadir campos de dirección: street, number, floor, postalCode, city, province
- [x] Actualizar formulario de cliente con nuevos campos
- [x] Actualizar pantalla de detalle de cliente
- [x] Actualizar todas las referencias a client.name en la app

## Sistema de Inventario Flexible
- [x] Crear tipos para categorías de productos (ProductCategory)
- [x] Actualizar tipo InventoryItem con categoryId
- [x] Crear hook para gestión de categorías de productos
- [x] Crear pantalla de gestión de categorías de productos
- [x] Actualizar formulario de inventario con selector de categoría
- [x] Permitir asociar proveedor opcional a cada elemento

## Catálogo de Servicios con Categorías
- [x] Crear tipos para categorías de servicios (ServiceCategory)
- [x] Actualizar tipo ServiceRate con categoryId
- [x] Crear hook para gestión de categorías de servicios
- [x] Crear pantalla de gestión de categorías de servicios
- [x] Actualizar catálogo de servicios con categorías editables
- [x] Permitir editar costes de servicios por categoría

## Bugs UI
- [x] Corregir categorías cortadas verticalmente en versión móvil (cambiado a layout vertical)
- [x] Corregir terminología: Martillos → Macillos
- [x] Corregir terminología: Entonación → Armonización

## Catálogo de Servicios y Inventario
- [x] Actualizar formulario de inventario con categorías y proveedores
- [x] Crear hook para categorías de servicios
- [x] Crear pantalla de gestión de categorías de servicios
- [x] Crear catálogo de servicios editable con precios

## Mejoras UX Inventario
- [x] Añadir botón de crear categoría desde formulario de material
- [x] Corregir alineación vertical del campo nombre en Proveedor (cambiado a layout vertical para tipos de proveedor)

## Validación NIF/CIF
- [x] Crear función de validación de NIF español (8 dígitos + letra)
- [x] Crear función de validación de NIE español (X/Y/Z + 7 dígitos + letra)
- [x] Crear función de validación de CIF español (letra + 7 dígitos + dígito/letra control)
- [x] Integrar validación en formulario de clientes
- [x] Mostrar feedback visual de validación (correcto/incorrecto)
- [x] Mostrar mensaje de error descriptivo cuando el formato es inválido

## Bugs Formularios
- [x] Selector de cliente no visible en formulario de nuevo piano (añadido mensaje y botón para crear cliente)
- [x] Verificar campos de facturación en formulario de cliente (todos los campos presentes)
- [x] Tipos de cliente cortados en móvil (cambiado a layout vertical)

## Dirección de Envío
- [x] Añadir campos de dirección de envío en el tipo Client
- [x] Añadir sección de dirección de envío en formulario de cliente
- [x] Añadir botón para copiar dirección fiscal a dirección de envío

## Materiales en Facturas
- [x] Obtener materiales usados del servicio al generar factura
- [x] Añadir materiales como conceptos adicionales en la factura PDF
- [x] Mostrar cantidad, precio unitario y total por material
- [x] Botón "Importar servicio" para añadir servicio + materiales a factura

## Contacto Rápido Proveedor
- [x] Añadir botón de llamar al proveedor desde inventario
- [x] Añadir botón de email al proveedor desde inventario
- [x] Mostrar botones solo cuando el material tiene proveedor asignado

## Instrucciones de Uso
- [x] Crear pantalla de ayuda/instrucciones accesible desde la app (Ajustes → Centro de Ayuda)
- [x] Documentar flujo de trabajo: Clientes → Pianos → Servicios → Facturas
- [x] Documentar gestión de inventario y proveedores
- [x] Documentar funciones de facturación (importar materiales, PDF, email)
- [x] Documentar validación NIF/CIF y dirección de envío
- [x] Documentar contacto rápido a proveedor

## Acceso Directo a Ayuda
- [x] Añadir sección de Ayuda en el Dashboard como acceso directo

## Mejoras Centro de Ayuda
- [x] Añadir buscador para filtrar preguntas por palabras clave
- [x] Mostrar resultados de búsqueda en tiempo real

## Tutorial Primer Uso
- [x] Crear pantalla de bienvenida para nuevos usuarios
- [x] Guía paso a paso interactiva (7 pasos)
- [x] Guardar estado de tutorial completado en AsyncStorage
- [x] Corregir botones para que el texto no se corte

## Sección de Novedades
- [x] Crear pantalla de novedades con últimas funcionalidades
- [x] Añadir acceso desde Centro de Ayuda

## Reiniciar Tutorial
- [x] Añadir botón en Configuración para reiniciar tutorial
- [x] Limpiar estado de AsyncStorage al reiniciar

## Badge de Novedades
- [x] Guardar última versión vista en AsyncStorage
- [x] Mostrar badge cuando hay novedades sin ver
- [x] Marcar como vistas al abrir la sección

## Exportar a Excel
- [x] Exportar clientes a CSV (ya existía en Configuración)
- [x] Exportar pianos a CSV (ya existía en Configuración)
- [x] Exportar servicios a CSV (ya existía en Configuración)

## Instrucciones de Instalación
- [x] Redactar instrucciones para instalar en iPhone/iPad
- [x] Redactar instrucciones para instalar en Android
- [x] Redactar instrucciones para usar en ordenador (web)
- [x] Crear documento publicable para la web (docs/instrucciones-instalacion.md)

## FASE 1: Agenda y Notificaciones
- [x] Vista de calendario mensual para servicios
- [x] Vista de calendario semanal para servicios
- [x] Notificaciones push de servicios próximos
- [x] Recordatorios automáticos de mantenimiento
- [x] Configuración de notificaciones en Ajustes

## FASE 2: Clientes y Pianos
- [ ] Añadir foto del piano (cámara/galería)
- [x] Mapa con ubicación de clientes
- [x] Historial de cambios de propietario del piano

## FASE 3: Facturación Avanzada
- [x] Plantillas de factura personalizables (logo, colores)
- [x] Numeración automática de facturas configurable
- [x] Resumen de facturación mensual/anual

## FASE 4: Inventario Mejorado
- [x] Escanear código de barras para añadir productos
- [x] Alertas de stock bajo por notificación
- [x] Historial de precios de compra

## FASE 5: Informes y Estadísticas
- [x] Dashboard con gráficos de ingresos mensuales
- [x] Informe de rentabilidad por tipo de servicio
- [x] Exportar informes a PDF

## FASE 6: Servicios Avanzados
- [x] Firma digital del cliente al finalizar servicio
- [x] Tiempo estimado de desplazamiento entre clientes
- [x] Modo offline mejorado con sincronización automática

## Mejoras Calendario y Documentación
- [x] Añadir navegación a meses anteriores y futuros en el calendario (sección Este Mes del Dashboard)
- [x] Actualizar instrucciones de uso con calendario y notificaciones
- [x] Crear presentación de marketing para Piano Emotion Manager

## Bugs UI
- [x] Corregir nombres de meses largos que no encajan en la navegación del Dashboard (usar abreviaturas en móvil)
- [x] Corregir navegación entre días en el calendario (funciona correctamente, abre nueva cita)
- [x] Añadir botón volver en todas las pantallas
  - [x] Formulario cliente
  - [x] Formulario piano
  - [x] Formulario servicio
  - [x] Formulario cita
  - [x] Formulario factura
  - [x] Formulario tarifa
  - [x] Formulario orden de trabajo
- [x] Facturas no aparecen al filtrar por meses/años anteriores (2022-2025) - SOLUCIONADO: filtrado ahora usa backend con dateFrom/dateTo
- [x] Citas no se muestran en la sección de agenda - SOLUCIONADO: bug de zona horaria en conversión de fechas corregido
- [x] Implementar filtros independientes de mes y año en facturas (permitir "Enero de todos los años", "Todos los meses de 2025", etc.) - COMPLETADO
  - [x] Formulario inventario
  - [x] Formulario proveedor
- [x] Corregir tipos de servicio cortados en formulario de nueva cita (layout vertical)
- [x] Corregir: clic en día de otro mes no navega al día correcto (corregido formato fecha local)
- [x] Corregir: día actual marcado un día adelantado (corregido usando fecha local en lugar de UTC)

## FASE 2: Foto del Piano
- [x] Añadir campo photoUrl al tipo Piano (ya existía como photo)
- [x] Implementar selector de imagen (cámara/galería)
- [x] Mostrar foto del piano en el formulario
- [x] Guardar foto en almacenamiento local

## Dashboard - Mejoras 2026-01-31

- [x] 1. Cambiar "Predicciones IA" por "Previsión"
- [x] 2. Usar cálculos logarítmicos basados en datos históricos de la BD
- [x] 3. En "Ingresos previstos" usar cantidad prevista (no porcentaje) en formato resumido (ej: 6.2k)
- [ ] 4. En "Este mes" cambiar "Hoy" por mes actual reducido (Ene, Feb, Mar...) para todos los idiomas
- [ ] 5. Agregar navegación a meses anteriores (ya existe pero verificar funcionamiento)
- [ ] 6. Arreglar icono del calendario para que navegue al calendario
- [ ] 7. Agregar segunda fila en Previsión con indicadores de Inventario y Carga de trabajo

## Bugs Nuevos Reportados (2026-02-01)

- [ ] Selectores de mes/año deben permitir solo selección específica (eliminar opción "Todos")
- [ ] Facturas limitadas a 30 por mes - problema de paginación no resuelto
- [x] Inventario no muestra los 93 artículos completos (verificar límite en query del servidor) - RESUELTO (commit 815e629)

## Ajustes de Diseño Inventario
- [x] Aumentar tamaños de texto en alerta de stock bajo para que coincidan con el resto de la página
- [x] Cambiar icono de interrogante por icono de cámara/escáner (qrcode)
- [x] Hacer botón de escáner circular en lugar de cuadrado
- [x] Reducir tamaño de los botones de filtro (fontSize: 11px, padding: 10/4px)
- [x] Unificar estilos de texto entre alerta de stock bajo y listado de inventario (ThemedText, fontSize 16/13)

## Nuevas Mejoras Inventario (2026-02-06)

- [x] Aplicar sombras a los elementos de la página de inventario (itemCard, filterChip, LowStockAlert, botones)
- [x] Añadir todas las categorías de productos en los filtros (pins, keys, pedals, hardware, chemicals, other)

## Bugs Inventario (2026-02-06)

- [x] Sombras no visibles en botones "Pedir" y filtros (aumentadas: offset 4, opacity 0.45, radius 8)
- [x] Filtros no responsive - se cortan en móvil/tablet (ajustado flexGrow: 0)
- [x] Icono de escáner sigue siendo interrogante (cambiado a camera.fill)

## Mejoras UX Filtros (2026-02-06)

- [x] Reducir altura de filtros (paddingVertical: Spacing.xs)
- [x] Cambiar de scroll horizontal a múltiples filas (flexWrap)
- [x] Aplicar diseño de tabs de configuración (indicador inferior, fontSize 15)

## Sistema de Categorías Configurables (2026-02-06)

- [x] Crear tabla inventory_categories en base de datos
- [x] Crear tRPC procedures para CRUD de categorías (list, getById, create, update, delete, reorder)
- [ ] Crear sección en Configuración para gestionar categorías
- [ ] Actualizar filtros de inventario para usar categorías dinámicas
- [ ] Crear script de migración de categorías hardcodeadas a BD
