export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
}

export interface LocationUpdate {
  coords: LocationCoords;
  timestamp: number;
}

type LocationCallback = (location: LocationUpdate) => void;

export class LocationService {
  private watchId: number | null = null;
  private callbacks: Set<LocationCallback> = new Set();
  private lastLocation: LocationUpdate | null = null;

  async getCurrentPosition(): Promise<LocationUpdate> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const update: LocationUpdate = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed
            },
            timestamp: position.timestamp
          };
          this.lastLocation = update;
          resolve(update);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  startWatching(callback: LocationCallback): void {
    if (!navigator.geolocation) {
      return;
    }

    this.callbacks.add(callback);

    if (this.watchId === null) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const update: LocationUpdate = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed
            },
            timestamp: position.timestamp
          };
          this.lastLocation = update;
          this.callbacks.forEach(cb => cb(update));
        },
        (error) => console.error('Location watch error:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }
  }

  stopWatching(callback?: LocationCallback): void {
    if (callback) {
      this.callbacks.delete(callback);
    } else {
      this.callbacks.clear();
    }

    if (this.callbacks.size === 0 && this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getLastLocation(): LocationUpdate | null {
    return this.lastLocation;
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  isDriving(speedMps: number | null | undefined, threshold: number = 13.4): boolean {
    if (speedMps === null || speedMps === undefined) return false;
    return speedMps > threshold;
  }
}

export const locationService = new LocationService();
