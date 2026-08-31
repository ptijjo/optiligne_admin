import { z } from 'zod';

export const routeSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  longName: z.string(),
  routeType: z.number(),
});

export const routesSchema = z.array(routeSchema);

export const catalogTripSchema = z.object({
  id: z.string(),
  headsign: z.string(),
  routeId: z.string(),
  departureSec: z.number().int().nonnegative(),
});

export const catalogTripsSchema = z.array(catalogTripSchema);

export const catalogStopSchema = z.object({
  stopId: z.string(),
  name: z.string(),
  sequence: z.number().int(),
  arrivalSec: z.number().int().nonnegative(),
  departureSec: z.number().int().nonnegative(),
});

export const catalogStopsSchema = z.array(catalogStopSchema);

export type Route = z.infer<typeof routeSchema>;
export type CatalogTrip = z.infer<typeof catalogTripSchema>;
export type CatalogStop = z.infer<typeof catalogStopSchema>;
