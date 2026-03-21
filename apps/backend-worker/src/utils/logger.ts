export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  severity: LogSeverity;
  message: string;
  component: string;
  action?: string;
  instanceName?: string;
  metadata?: any;
  error?: any;
}

export class Logger {
    // Nível configurável via ambiente - default INFO em produção
    private static level: LogLevel = (() => {
        const env = process.env.LOG_LEVEL?.toUpperCase();
        if (env === 'DEBUG') return LogLevel.DEBUG;
        if (env === 'WARN') return LogLevel.WARN;
        if (env === 'ERROR') return LogLevel.ERROR;
        // Em produção (NODE_ENV=production), 默认 INFO
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    })();

    private static shouldLog(level: LogLevel): boolean {
        return level >= Logger.level;
    }

    private static format(entry: LogEntry): string {
        // Em produção, usa formato compacto para reduzir custos de Cloud Logging
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
            // Formato compacto: severity | component | message | instance
            const parts = [
                entry.severity,
                entry.component,
                entry.message,
                entry.instanceName || ''
            ].filter(Boolean);
            return parts.join(' | ');
        }

        // Formato completo para desenvolvimento
        const payload: any = {
            severity: entry.severity,
            message: entry.message,
            component: entry.component,
            action: entry.action,
            instanceName: entry.instanceName,
            timestamp: new Date().toISOString()
        };

        if (entry.metadata) {
            Object.assign(payload, entry.metadata);
        }

        if (entry.error) {
            payload['error_name'] = entry.error.name;
            payload['error_message'] = entry.error.message || String(entry.error);
            
            if (entry.error.response) {
                payload['axios_error'] = {
                    status: entry.error.response.status,
                    data: entry.error.response.data,
                    url: entry.error.config?.url
                };
            }
            
            if (entry.error.stack) {
                payload['stack'] = entry.error.stack;
            }
        }

        return JSON.stringify(payload);
    }

    static info(component: string, message: string, meta: Partial<LogEntry> = {}) {
        if (Logger.shouldLog(LogLevel.INFO)) {
            console.log(this.format({ severity: 'INFO', component, message, ...meta }));
        }
    }

    static warn(component: string, message: string, meta: Partial<LogEntry> = {}) {
        if (Logger.shouldLog(LogLevel.WARN)) {
            console.warn(this.format({ severity: 'WARNING', component, message, ...meta }));
        }
    }

    static error(component: string, message: string, error?: any, meta: Partial<LogEntry> = {}) {
        if (Logger.shouldLog(LogLevel.ERROR)) {
            console.error(this.format({ severity: 'ERROR', component, message, error, ...meta }));
        }
    }

    static debug(component: string, message: string, meta: Partial<LogEntry> = {}) {
        if (Logger.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.format({ severity: 'DEBUG', component, message, ...meta }));
        }
    }
}
