interface Env {
  ROOMS: DurableObjectNamespace<import('./room.ts').GameRoom>
  CREATE_LIMIT: RateLimit
  API_LIMIT: RateLimit
}
