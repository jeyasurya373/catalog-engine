export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://rubick:rubick@localhost:5432/rubick",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "http://localhost:8000",
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:4000",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
};
