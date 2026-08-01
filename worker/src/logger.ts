function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  info: (msg: string) => console.log(`[${timestamp()}] [INFO] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[${timestamp()}] [ERROR] ${msg}`, err),
};