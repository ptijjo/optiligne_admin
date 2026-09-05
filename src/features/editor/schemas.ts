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
  routeType: z.number(),
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

export const createRouteResponseSchema = z.object({
  routeId: z.string().min(1),
  tripId: z.string().min(1),
  feedVersion: z.string(),
  message: z.string(),
});

export const createCalendarSchema = z
  .object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
    startDate: z.string().min(8),
    endDate: z.string().min(8),
  })
  .refine(
    (c) => c.monday || c.tuesday || c.wednesday || c.thursday || c.friday || c.saturday || c.sunday,
    { message: 'Au moins un jour de circulation.' },
  );

export const createTripTimesSchema = z.object({
  headsign: z.string(),
  arrivalSecs: z.array(z.number().int().gte(0)).min(2),
});

export const createRouteBodySchema = z.object({
  operatorCode: z.string().min(1),
  depotCode: z.string().min(1),
  shortName: z.string().min(1),
  longName: z.string().min(1),
  routeType: z.union([z.literal(204), z.literal(712), z.literal(713)]),
  stops: z.array(editorStopSchema).min(2),
  shape: lineStringSchema,
  calendar: createCalendarSchema,
  trips: z.array(createTripTimesSchema).min(1),
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
export type CreateRouteBody = z.infer<typeof createRouteBodySchema>;
export type CreateRouteResponse = z.infer<typeof createRouteResponseSchema>;
export type CreateCalendar = z.infer<typeof createCalendarSchema>;
export type CreateTripTimes = z.infer<typeof createTripTimesSchema>;
