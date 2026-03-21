/**
 * Circuit Breaker para proteger contra APIs instáveis
 * 
 * Estados:
 * - CLOSED: Normal - requisições passam
 * - OPEN: Falhou muito - bloqueia requisições imediatamente  
 * - HALF_OPEN: Testando se a API recuperou
 */

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
    failureThreshold: number;  // Falhas para abrir o circuito (default: 5)
    successThreshold: number;  // Sucessos para fechar o circuito (default: 2)
    timeout: number;           // Tempo em ms para tentar novamente (default: 30000)
    errorFilter?: (error: any) => boolean; // Função opcional para ignorar erros específicos
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures = 0;
    private successes = 0;
    private lastFailureTime = 0;
    
    constructor(
        private name: string,
        private config: CircuitBreakerConfig = {
            failureThreshold: 30, // Aumentado para 30
            successThreshold: 1,  // Diminuído para 1 (basta 1 sucesso)
            timeout: 5000, // Diminuído para 5s para curar extremamente rápido e n travar media
            errorFilter: (error: any) => {
                const status = error.response?.status || error.status;
                // Filtrar apenas 400 (Bad Request - mídia não pronta).
                // 404, 403, 429 devem contar como falhas ou não ser ignorados pelo circuit breaker.
                return (
                    error.isApplicationError || 
                    status === 400
                );
            }
        }
    ) {
        // Garante que o filtro padrão exista se não for passado
        if (!this.config.errorFilter) {
            this.config.errorFilter = (error: any) => {
                const status = error.response?.status || error.status;
                return (
                    error.isApplicationError || 
                    status === 400
                );
            };
        }
        console.log(`[CircuitBreaker] ${name} initialized with threshold: ${config.failureThreshold}, timeout: ${config.timeout}`);
    }

    /**
     * Executa uma operação com proteção de circuit breaker
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Se está OPEN, verifica se deve tentar HALF_OPEN
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.config.timeout) {
                console.log(`[CircuitBreaker] ${this.name} transitioning to HALF_OPEN`);
                this.state = CircuitState.HALF_OPEN;
                this.successes = 0;
            } else {
                throw new Error(`CIRCUIT_OPEN: ${this.name} is OPEN - rejecting request`);
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error: any) {
            // [SRE] Usa o errorFilter configurado para decidir se conta como falha
            if (this.config.errorFilter && this.config.errorFilter(error)) {
                // Ignorado pelo filtro (ex: 400 Bad Request, 404 Not Found)
                // Não chama onFailure(), apenas repassa o erro
            } else {
                this.onFailure();
            }
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        
        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            console.log(`[CircuitBreaker] ${this.name} success ${this.successes}/${this.config.successThreshold} in HALF_OPEN`);
            
            if (this.successes >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                console.log(`[CircuitBreaker] ${this.name} CLOSED after recovery`);
            }
        }
    }

    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            // Uma falha em HALF_OPEN volta para OPEN
            this.state = CircuitState.OPEN;
            console.warn(`[CircuitBreaker] ${this.name} OPEN (failure in HALF_OPEN)`);
        } else if (this.failures >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            console.warn(`[CircuitBreaker] ${this.name} OPEN after ${this.failures} failures`);
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    getFailures(): number {
        return this.failures;
    }

    /**
     * Reseta o circuit breaker manualmente
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        console.log(`[CircuitBreaker] ${this.name} manually reset to CLOSED`);
    }
}

// Singleton global para gerenciar circuit breakers por instância
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Obtém ou cria um circuit breaker para uma instância específica
 */
export function getCircuitBreaker(instanceName: string): CircuitBreaker {
    if (!circuitBreakers.has(instanceName)) {
        circuitBreakers.set(instanceName, new CircuitBreaker(instanceName));
    }
    return circuitBreakers.get(instanceName)!;
}

/**
 * Obtém todos os circuit breakers (para monitoramento)
 */
export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return circuitBreakers;
}

/**
 * Remove um circuit breaker (para cleanup)
 */
export function removeCircuitBreaker(instanceName: string): void {
    circuitBreakers.delete(instanceName);
}
