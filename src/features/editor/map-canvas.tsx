'use client';

import type { EditorStop, LineString, Waypoint } from '@/features/editor/schemas';
import { isNearShape } from '@/features/editor/shape-edit';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Marker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const stopIcon = L.divIcon({
  className: 'ol-stop-icon',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const stopSelectedIcon = L.divIcon({
  className: 'ol-stop-icon ol-stop-selected',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const waypointIcon = L.divIcon({
  className: 'ol-waypoint-icon',
  html: '<span></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const vertexIcon = L.divIcon({
  className: 'ol-vertex-icon',
  html: '<span></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

type Props = {
  shape: LineString;
  stops: EditorStop[];
  waypoints: Waypoint[];
  addWaypointMode: boolean;
  addStopMode: boolean;
  editShapeMode: boolean;
  pickStopsMode: boolean;
  selectedStopIds: string[];
  pinnedVertexIndices: number[];
  onStopMove: (stopId: string, lat: number, lng: number) => void;
  onStopPick: (stopId: string) => void;
  onWaypointAdd: (lat: number, lng: number) => void;
  onMapAddStop: (lat: number, lng: number) => void;
  onWaypointMove: (index: number, lat: number, lng: number) => void;
  onShapePin: (lat: number, lng: number) => void;
  onVertexMove: (index: number, lat: number, lng: number) => void;
  onShapeRedraw: (strokeLngLat: number[][]) => void;
};

function ClickCapture({
  waypointMode,
  addStopMode,
  onWaypoint,
  onAddStop,
}: {
  waypointMode: boolean;
  addStopMode: boolean;
  onWaypoint: (lat: number, lng: number) => void;
  onAddStop: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (addStopMode) {
        onAddStop(e.latlng.lat, e.latlng.lng);
        return;
      }
      if (waypointMode) {
        onWaypoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function ShapeStroke({
  enabled,
  shape,
  onRedraw,
  onPin,
}: {
  enabled: boolean;
  shape: LineString;
  onRedraw: (strokeLngLat: number[][]) => void;
  onPin: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const drawing = useRef(false);
  const samples = useRef<number[][]>([]);
  const [preview, setPreview] = useState<[number, number][]>([]);

  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = enabled ? 'crosshair' : '';
    return () => {
      el.style.cursor = '';
      if (drawing.current) {
        drawing.current = false;
        map.dragging.enable();
        samples.current = [];
      }
    };
  }, [enabled, map]);

  const finish = useCallback(() => {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    map.dragging.enable();
    const stroke = samples.current;
    samples.current = [];
    setPreview([]);
    if (stroke.length < 2) {
      return;
    }
    const first = stroke[0];
    const last = stroke[stroke.length - 1];
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    if (stroke.length >= 4 || dx * dx + dy * dy > 1e-8) {
      onRedraw(stroke);
      return;
    }
    onPin(first[1], first[0]);
  }, [map, onPin, onRedraw]);

  useEffect(() => {
    const onUp = () => finish();
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [finish]);

  useMapEvents({
    mousedown(e) {
      if (!enabled || e.originalEvent.button !== 0) {
        return;
      }
      if (!isNearShape(shape, e.latlng.lat, e.latlng.lng)) {
        return;
      }
      drawing.current = true;
      samples.current = [[e.latlng.lng, e.latlng.lat]];
      map.dragging.disable();
      L.DomEvent.preventDefault(e.originalEvent);
    },
    mousemove(e) {
      if (!drawing.current) {
        return;
      }
      const last = samples.current[samples.current.length - 1];
      const dx = e.latlng.lng - last[0];
      const dy = e.latlng.lat - last[1];
      if (dx * dx + dy * dy < 1.6e-9) {
        return;
      }
      samples.current.push([e.latlng.lng, e.latlng.lat]);
      setPreview(samples.current.map(([lng, lat]) => [lat, lng] as [number, number]));
    },
    mouseup() {
      finish();
    },
  });

  if (preview.length < 2) {
    return null;
  }
  return (
    <Polyline
      positions={preview}
      pathOptions={{ color: '#f4a261', weight: 6, opacity: 0.95, dashArray: '8 6' }}
    />
  );
}

function FitMap() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

export function MapCanvas({
  shape,
  stops,
  waypoints,
  addWaypointMode,
  addStopMode,
  editShapeMode,
  pickStopsMode,
  selectedStopIds,
  pinnedVertexIndices,
  onStopMove,
  onStopPick,
  onWaypointAdd,
  onMapAddStop,
  onWaypointMove,
  onShapePin,
  onVertexMove,
  onShapeRedraw,
}: Props) {
  const positions = shape.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  const center = stops[0]
    ? ([stops[0].lat, stops[0].lng] as [number, number])
    : ([49.12, 6.18] as [number, number]);
  const mapBusy = pickStopsMode || addWaypointMode || addStopMode;

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <FitMap />
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length >= 2 ? (
        <Polyline
          positions={positions}
          pathOptions={{
            color: 'var(--brand, #0056D6)',
            weight: editShapeMode ? 10 : 6,
            opacity: 0.85,
          }}
        />
      ) : null}
      <ShapeStroke
        enabled={editShapeMode && !addStopMode}
        shape={shape}
        onRedraw={onShapeRedraw}
        onPin={onShapePin}
      />
      {stops.map((stop) => {
        const selected = selectedStopIds.includes(stop.stopId);
        return (
          <Marker
            key={`${stop.stopId}:${stop.sequence}`}
            position={[stop.lat, stop.lng]}
            draggable={!mapBusy}
            icon={selected ? stopSelectedIcon : stopIcon}
            eventHandlers={{
              click: () => {
                if (pickStopsMode) {
                  onStopPick(stop.stopId);
                }
              },
              dragend: (event) => {
                const ll = event.target.getLatLng();
                onStopMove(stop.stopId, ll.lat, ll.lng);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              {stop.name}
            </Tooltip>
          </Marker>
        );
      })}
      {waypoints.map((wp, i) => (
        <Marker
          key={`wp-${i}`}
          position={[wp.lat, wp.lng]}
          draggable
          icon={waypointIcon}
          eventHandlers={{
            dragend: (event) => {
              const ll = event.target.getLatLng();
              onWaypointMove(i, ll.lat, ll.lng);
            },
          }}
        >
          <Tooltip>Point de passage {i + 1} — glissez pour déplacer</Tooltip>
        </Marker>
      ))}
      {pinnedVertexIndices.map((index) => {
        const pt = shape.coordinates[index];
        if (!pt) {
          return null;
        }
        const [lng, lat] = pt;
        return (
          <Marker
            key={`vx-${index}`}
            position={[lat, lng]}
            draggable
            icon={vertexIcon}
            eventHandlers={{
              dragend: (event) => {
                const ll = event.target.getLatLng();
                onVertexMove(index, ll.lat, ll.lng);
              },
            }}
          >
            <Tooltip>Sommet du tracé — glissez pour corriger</Tooltip>
          </Marker>
        );
      })}
      <ClickCapture
        waypointMode={addWaypointMode && !pickStopsMode && !addStopMode}
        addStopMode={addStopMode}
        onWaypoint={onWaypointAdd}
        onAddStop={onMapAddStop}
      />
    </MapContainer>
  );
}
