import { z } from 'zod';

export const editorStopSchema = z.object({
  stopId: z.string().min(1),
  name: z.string(),
  sequence: z.number().int(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const waypointSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  afterStopId: z.string().min(1).optional(),
});

export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.array(z.number()).min(2)).min(2),
});

export const draftSchema = z.object({
  routeId: z.string(),
  shortName: z.string(),
  longName: z.string(),
  tripId: z.string(),
  shapeId: z.string(),
  feedVersion: z.string(),
  shape: lineStringSchema,
  stops: z.array(editorStopSchema),
});

export const recalcResponseSchema = z.object({
  shape: lineStringSchema,
});

export const saveResponseSchema = z.object({
  feedVersion: z.string(),
  message: z.string(),
});

export const stopPatchSchema = z.object({
  stopId: z.string().min(1),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const stopHitSchema = z.object({
  stopId: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export type EditorStop = z.infer<typeof editorStopSchema>;
export type Waypoint = z.infer<typeof waypointSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type LineString = z.infer<typeof lineStringSchema>;
export type StopHit = z.infer<typeof stopHitSchema>;
