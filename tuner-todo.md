# Piano Tuner Pro — TODO Mejoras

- [x] AudioWorklet: mover procesamiento de audio a thread dedicado (latencia ~5ms)
- [x] Espectrograma en tiempo real: visualización FFT de parciales
- [x] Calibración individual de inharmonicidad por piano
- [x] Gráfico de curva de Railsback (afinación completa del piano)
- [x] Modo de afinación por unísono (detección de batidos)
- [x] Generador de tonos de referencia
- [x] Integrar todas las mejoras en TunerScreen con tabs/navegación
- [x] Push a GitHub con todas las mejoras

## Ronda 2 — Mejoras profesionales avanzadas

- [x] Modo de afinación guiada paso a paso (asistente de afinación)
- [x] Historial de afinaciones por piano (perfiles individuales)
- [x] Detección de calidad de cuerda (oxidación, cuerdas falsas, resonancias)
- [x] Exportar informe de afinación en PDF
- [x] Modo offline completo con PWA (Service Worker + manifest)
- [x] Temperamentos históricos (Werckmeister III, Kirnberger III, Vallotti, Young, Meantone)
- [x] Compensación de latencia del micrófono (calibración de hardware)
- [x] Integrar todas las mejoras en navegación y contexto
- [x] Push a GitHub
- [x] Offline-first IndexedDB storage para perfiles y afinaciones
- [x] Background Sync API para sincronización diferida con servidor
- [x] Indicador visual de estado online/offline y sincronización pendiente

## Ronda 3 — Traducciones y Responsive

- [x] Añadir traducciones del afinador a en.json
- [x] Añadir traducciones del afinador a de.json
- [x] Añadir traducciones del afinador a fr.json
- [x] Añadir traducciones del afinador a it.json
- [x] Añadir traducciones del afinador a pt.json
- [x] Añadir traducciones del afinador a da.json
- [x] Añadir traducciones del afinador a no.json
- [x] Añadir traducciones del afinador a sv.json
- [x] Fix responsive layout en todos los componentes del afinador (menú categorizado responsive)

## Ronda 4 — Poliment final i qualitat professional

- [x] Mode fosc optimitzat per a afinació (fons negre pur, alt contrast)
- [x] Indicador de nivell de senyal (VU meter) al micròfon
- [x] Animacions suaus al medidor de cents amb react-native-reanimated
- [x] Filtre de soroll ambiental (passa-banda 27.5-4186 Hz + noise gate)
- [x] Mitjana mòbil ponderada (EMA) per estabilitzar lectures
- [x] Correcció d'octava millorada (anàlisi de parcials)
- [x] Tutorial interactiu per a principiants (onboarding 3-4 passos)

## Ronda 5 — Millores professionals per a tècnics

- [x] Feedback auditiu de proximitat (beep que accelera prop del centre)
- [x] Mode pantalla completa immersiu (amagar navegació, només medidor)
- [x] Histograma d'estabilitat per nota (últimes 10 lectures)
- [x] Detecció multi-corda (uníson avançat, separar freqüències individuals)
- [x] Mapa de calor del piano (88 tecles, verd→vermell)
- [x] Compartir informe per email/WhatsApp (Share API)
- [x] Predicció de deriva (quines notes es desafinaran primer)
- [x] Toggles on/off per a cada funcionalitat als ajustos
- [x] Integrar tot al TunerScreen i context
- [x] Push a GitHub

## Ronda 6 — Fix responsive mòbil

- [ ] Fix menú de categories: tiles massa amples en mòbil, contingut tallat
- [ ] Assegurar scroll horitzontal per categories en pantalles estretes
- [ ] Reduir mida de tiles i icones en mòbil (<400px)
- [ ] Verificar que totes les seccions (Afinación, Análisis, Configuración) siguin accessibles
