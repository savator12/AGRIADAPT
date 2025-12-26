'use client'

import { useEffect, useRef, useState } from 'react'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Point } from 'ol/geom'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { Feature } from 'ol'
import { Style, Circle, Fill, Stroke } from 'ol/style'

interface LocationMapProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
  height?: string
}

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  height = '400px',
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const markerRef = useRef<Feature<Point> | null>(null)
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const [mounted, setMounted] = useState(false)

  // Default to Ethiopia center if no coordinates provided
  const defaultLat = latitude || 9.1450
  const defaultLng = longitude || 38.7617

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Wait for ref to be available
    if (!mapRef.current) return
    
    // Don't create map if it already exists
    if (mapInstanceRef.current) return

    try {
      // Create vector source and layer for marker
      const vectorSource = new VectorSource()
      vectorSourceRef.current = vectorSource
      
      const vectorLayer = new VectorLayer({
        source: vectorSource,
      })

      // Create map
      const map = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          vectorLayer,
        ],
        view: new View({
          center: fromLonLat([defaultLng, defaultLat]),
          zoom: latitude && longitude ? 12 : 6,
        }),
      })

      mapInstanceRef.current = map

      // Add click handler
      map.on('click', (event) => {
        const coordinate = event.coordinate
        const lonLat = toLonLat(coordinate)
        const [lng, lat] = lonLat

        // Update or create marker
        if (markerRef.current) {
          markerRef.current.setGeometry(new Point(coordinate))
        } else {
          // Create new marker with simple circle style
          const marker = new Feature({
            geometry: new Point(coordinate),
          })

          marker.setStyle(
            new Style({
              image: new Circle({
                radius: 8,
                fill: new Fill({
                  color: '#22c55e',
                }),
                stroke: new Stroke({
                  color: '#ffffff',
                  width: 2,
                }),
              }),
            })
          )

          vectorSource.addFeature(marker)
          markerRef.current = marker
        }

        // Call callback
        onLocationChange(lat, lng)
      })

      // Set initial marker if coordinates provided
      if (latitude && longitude) {
        const coordinate = fromLonLat([longitude, latitude])
        const marker = new Feature({
          geometry: new Point(coordinate),
        })

        marker.setStyle(
          new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({
                color: '#22c55e',
              }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 2,
              }),
            }),
          })
        )

        vectorSource.addFeature(marker)
        markerRef.current = marker
      }

      // Mark as mounted after map is created
      setMounted(true)
    } catch (error) {
      console.error('Error creating map:', error)
      setMounted(true) // Still set mounted to show error state
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined)
        mapInstanceRef.current = null
      }
      vectorSourceRef.current = null
      markerRef.current = null
    }
  }, []) // Only run once on mount

  // Update map when latitude/longitude props change
  useEffect(() => {
    if (!mapInstanceRef.current || !mounted || !vectorSourceRef.current) return

    const map = mapInstanceRef.current
    const view = map.getView()
    const vectorSource = vectorSourceRef.current

    if (latitude && longitude) {
      const coordinate = fromLonLat([longitude, latitude])
      
      // Update marker
      if (markerRef.current) {
        markerRef.current.setGeometry(new Point(coordinate))
      } else {
        // Create new marker
        const marker = new Feature({
          geometry: new Point(coordinate),
        })

        marker.setStyle(
          new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({
                color: '#22c55e',
              }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 2,
              }),
            }),
          })
        )

        vectorSource.addFeature(marker)
        markerRef.current = marker
      }

      // Center and zoom map
      view.setCenter(coordinate)
      view.setZoom(12)
    } else {
      // Reset to default location
      view.setCenter(fromLonLat([defaultLng, defaultLat]))
      view.setZoom(6)
      
      // Remove marker
      if (markerRef.current) {
        vectorSource.removeFeature(markerRef.current)
        markerRef.current = null
      }
    }
  }, [latitude, longitude, defaultLat, defaultLng, mounted])

  return (
    <div
      className="w-full rounded-lg overflow-hidden border border-gray-300"
      style={{ height, position: 'relative' }}
    >
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        className="ol-map"
      />
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">Loading map...</p>
        </div>
      )}
      <div className="bg-white p-2 border-t border-gray-300 text-xs text-gray-600">
        {latitude && longitude ? (
          <>
            Location: {latitude.toFixed(6)}, {longitude.toFixed(6)} - Click on
            map to change
          </>
        ) : (
          <>Click on the map to select location</>
        )}
      </div>
    </div>
  )
}
