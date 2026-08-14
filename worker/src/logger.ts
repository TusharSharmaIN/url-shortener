function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  info: (msg: string) => console.log(`[${timestamp()}] [INFO] ${msg}`),
  warn: (msg: string, err?: unknown) =>
    console.warn(`[${timestamp()}] [WARN] ${msg}`, err ?? ""),
  error: (msg: string, err?: unknown) =>
    console.error(`[${timestamp()}] [ERROR] ${msg}`, err),
};
