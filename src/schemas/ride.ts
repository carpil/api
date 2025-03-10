import { z } from 'zod'
import { MAXIMUM_NAME_LENGTH, MAXIMUM_RIDE_PRICE, MAXIMUM_SEATS } from 'utils/constants'

const locationSchema = z.object({
  id: z.string(),
  name: z.object({
    primary: z.string().min(1).max(MAXIMUM_NAME_LENGTH),
    secondary: z.string().min(1).max(MAXIMUM_NAME_LENGTH)
  }),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })
})

const rideSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  meetingPoint: locationSchema,
  availableSeats: z.number().min(1).max(MAXIMUM_SEATS),
  price: z.number().min(1).max(MAXIMUM_RIDE_PRICE),
  departureDate: z.string().transform((departureDate) => new Date(departureDate))
}).refine(
  (ride) =>
    !areLocationsEqual(ride.origin, ride.destination) &&
    !areLocationsEqual(ride.origin, ride.meetingPoint) &&
    !areLocationsEqual(ride.destination, ride.meetingPoint),
  {
    message: 'Origin, destination, and meeting point must be different locations',
    path: ['origin', 'destination', 'meetingPoint']
  }
)

export const validateRide = (ride: any): z.SafeParseReturnType<any, any> => {
  return rideSchema.safeParse(ride)
}

const areLocationsEqual = (loc1: any, loc2: any): boolean => {
  return loc1.location.lat === loc2.location.lat && loc1.location.lng === loc2.location.lng
}
