/**
 * WebMapView Component
 * Piano Emotion Manager
 * 
 * Google Maps implementation for web using @react-google-maps/api
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const COLORS = {
  primary: '#003a8c',
  accent: '#e07a5f',
  vip: '#FFD700',
  white: '#ffffff',
};

type Client = {
  id: string;
  firstName?: string;
  lastName1?: string;
  latitude: number;
  longitude: number;
  isVip?: boolean;
  address?: {
    street?: string;
    number?: string;
    city?: string;
    province?: string;
  };
};

type WebMapViewProps = {
  clients: Client[];
  routeColor: string;
  onMarkerPress?: (clientId: string) => void;
  mapRef?: React.MutableRefObject<any>;
};

const containerStyle = {
  width: '100%',
  height: '500px',
};

export function WebMapView({ clients, routeColor, onMarkerPress, mapRef }: WebMapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [center, setCenter] = useState({ lat: 40.4168, lng: -3.7038 }); // Madrid por defecto

  // Calcular centro del mapa basado en clientes
  useEffect(() => {
    if (clients.length > 0) {
      const avgLat = clients.reduce((sum, c) => sum + c.latitude, 0) / clients.length;
      const avgLng = clients.reduce((sum, c) => sum + c.longitude, 0) / clients.length;
      setCenter({ lat: avgLat, lng: avgLng });
    }
  }, [clients]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (mapRef) {
      mapRef.current = map;
    }

    // Auto-ajustar para mostrar todos los markers
    if (clients.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      clients.forEach((client) => {
        bounds.extend({ lat: client.latitude, lng: client.longitude });
      });
      map.fitBounds(bounds);

      // Ajustar padding
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [clients, mapRef]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (clientId: string) => {
    setSelectedMarker(clientId);
    if (onMarkerPress) {
      onMarkerPress(clientId);
    }
  };

  const handleInfoWindowClose = () => {
    setSelectedMarker(null);
  };

  // Solo renderizar en web
  if (Platform.OS !== 'web') {
    return null;
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <View style={styles.errorContainer}>
        <p style={styles.errorText}>
          Google Maps API key no configurada. Añade EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en variables de entorno.
        </p>
      </View>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {clients.map((client) => {
          const isSelected = selectedMarker === client.id;
          const markerColor = client.isVip ? COLORS.vip : routeColor;

          return (
            <React.Fragment key={client.id}>
              <Marker
                position={{ lat: client.latitude, lng: client.longitude }}
                onClick={() => handleMarkerClick(client.id)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: markerColor,
                  fillOpacity: 1,
                  strokeColor: COLORS.white,
                  strokeWeight: 2,
                }}
              />
              {isSelected && (
                <InfoWindow
                  position={{ lat: client.latitude, lng: client.longitude }}
                  onCloseClick={handleInfoWindowClose}
                >
                  <div style={styles.infoWindow}>
                    <h3 style={styles.infoWindowTitle}>
                      {client.firstName} {client.lastName1}
                      {client.isVip && ' ⭐'}
                    </h3>
                    {client.address && (
                      <>
                        <p style={styles.infoWindowText}>
                          {client.address.street} {client.address.number}
                        </p>
                        <p style={styles.infoWindowText}>
                          {client.address.city}, {client.address.province}
                        </p>
                      </>
                    )}
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          );
        })}
      </GoogleMap>
    </LoadScript>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 20,
    backgroundColor: '#fee',
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
  },
  infoWindow: {
    padding: 8,
  },
  infoWindowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.primary,
  },
  infoWindowText: {
    fontSize: 14,
    color: '#666',
    margin: 0,
  },
});
