export type ClientLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const LOCATION_EVENT = "ubifood:location";
let lastLocation: ClientLocation | null = null;

export function publishClientLocation(location: ClientLocation) {
  lastLocation = location;
  window.dispatchEvent(
    new CustomEvent<ClientLocation>(LOCATION_EVENT, { detail: location }),
  );
}

export function subscribeClientLocation(
  listener: (location: ClientLocation) => void,
) {
  const handleLocation = (event: Event) => {
    listener((event as CustomEvent<ClientLocation>).detail);
  };
  window.addEventListener(LOCATION_EVENT, handleLocation);
  if (lastLocation) {
    const savedLocation = lastLocation;
    queueMicrotask(() => listener(savedLocation));
  }
  return () => window.removeEventListener(LOCATION_EVENT, handleLocation);
}
