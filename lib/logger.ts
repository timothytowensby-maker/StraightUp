export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  [key: string]: any;
}

export const logger = {
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : undefined;
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: err?.message,
      stack: err?.stack,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },

  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },

  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      }));
    }
  },
};
