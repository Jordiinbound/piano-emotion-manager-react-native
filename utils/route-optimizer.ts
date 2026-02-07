/**
 * Optimizador de Rutas
 * Piano Emotion Manager
 * 
 * Algoritmo de optimización de rutas usando Nearest Neighbor (TSP)
 */

export interface ClientLocation {
  id: number;
  latitude: number;
  longitude: number;
  firstName?: string;
  lastName1?: string;
}

/**
 * Calcular distancia entre dos puntos usando fórmula de Haversine
 * Retorna distancia en kilómetros
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Optimizar ruta usando algoritmo Nearest Neighbor
 * Este es un algoritmo greedy que encuentra una solución aproximada al TSP
 * 
 * @param clients - Lista de clientes con coordenadas
 * @param startIndex - Índice del cliente inicial (opcional, por defecto 0)
 * @returns Lista de clientes ordenados por proximidad
 */
export function optimizeRoute(
  clients: ClientLocation[],
  startIndex: number = 0
): ClientLocation[] {
  if (clients.length <= 1) return clients;

  const visited = new Set<number>();
  const optimized: ClientLocation[] = [];
  
  // Empezar con el cliente especificado
  let currentClient = clients[startIndex];
  optimized.push(currentClient);
  visited.add(currentClient.id);

  // Mientras queden clientes sin visitar
  while (visited.size < clients.length) {
    let nearestClient: ClientLocation | null = null;
    let minDistance = Infinity;

    // Encontrar el cliente más cercano al actual
    for (const client of clients) {
      if (visited.has(client.id)) continue;

      const distance = calculateDistance(
        currentClient.latitude,
        currentClient.longitude,
        client.latitude,
        client.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestClient = client;
      }
    }

    if (nearestClient) {
      optimized.push(nearestClient);
      visited.add(nearestClient.id);
      currentClient = nearestClient;
    } else {
      break; // No debería ocurrir, pero por seguridad
    }
  }

  return optimized;
}

/**
 * Calcular distancia total de una ruta
 * @param clients - Lista ordenada de clientes
 * @returns Distancia total en kilómetros
 */
export function calculateTotalDistance(clients: ClientLocation[]): number {
  if (clients.length <= 1) return 0;

  let totalDistance = 0;

  for (let i = 0; i < clients.length - 1; i++) {
    totalDistance += calculateDistance(
      clients[i].latitude,
      clients[i].longitude,
      clients[i + 1].latitude,
      clients[i + 1].longitude
    );
  }

  return totalDistance;
}

/**
 * Estimar tiempo de viaje basado en distancia
 * Asume velocidad promedio de 40 km/h en ciudad
 * @param distanceKm - Distancia en kilómetros
 * @returns Tiempo estimado en minutos
 */
export function estimateTravelTime(distanceKm: number): number {
  const AVERAGE_SPEED_KMH = 40; // Velocidad promedio en ciudad
  const timeHours = distanceKm / AVERAGE_SPEED_KMH;
  const timeMinutes = timeHours * 60;
  return Math.round(timeMinutes);
}

/**
 * Formatear tiempo en formato legible
 * @param minutes - Tiempo en minutos
 * @returns String formateado (ej: "2h 30min")
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}
