export interface Location {
  id: string
  name: {
    primary: string
    secondary: string
  }
  location: {
    lat: number
    lng: number
  }
}
