/**
 * Logger utility - Only logs in development mode
 */

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args);
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // Always log errors
        console.error(...args);
    },
    debug: (...args: unknown[]) => {
        if (isDev) console.debug(...args);
    },
    info: (...args: unknown[]) => {
        if (isDev) console.info(...args);
    },
};

// Convenience aliases
export const devLog = logger.log;
export const devWarn = logger.warn;
export const devError = logger.error;
