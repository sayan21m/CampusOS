export const LOCAL_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

export const PRODUCTION_FRONTEND_ORIGINS = ["https://campus-os-gilt.vercel.app"];

export function parseConfiguredOrigins(frontendUrl = process.env.FRONTEND_URL) {
  return String(frontendUrl || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function allowedFrontendOrigins(frontendUrl = process.env.FRONTEND_URL) {
  return [
    ...new Set([
      ...LOCAL_FRONTEND_ORIGINS,
      ...PRODUCTION_FRONTEND_ORIGINS,
      ...parseConfiguredOrigins(frontendUrl),
    ]),
  ];
}

export function resolvePasswordResetOrigin(frontendUrl = process.env.FRONTEND_URL) {
  const configured = parseConfiguredOrigins(frontendUrl);

  if (configured[0]) {
    return configured[0];
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_FRONTEND_ORIGINS[0];
  }

  return LOCAL_FRONTEND_ORIGINS[0];
}

export function corsOriginDelegate(allowedOrigins = allowedFrontendOrigins()) {
  return function origin(requestOrigin, callback) {
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}
