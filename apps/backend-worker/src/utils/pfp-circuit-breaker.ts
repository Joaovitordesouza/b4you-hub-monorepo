/**
 * Circuit Breaker específico para Fetch de Fotos de Perfil (PFP)
 * 
 * Thresholds menores que o circuit breaker geral para ser mais sensível
 * e evitar sobrecarga na Evolution API durante sincronizações.
 * 
 * Estados:
 * - CLOSED: Normal - requisições passam
 * - OPEN: Falhou muito - bloqueia requisições imediatamente  
 * - HALF_OPEN: Testando se a API recuperou
 */

import { CircuitBreaker, CircuitState, CircuitBreakerConfig } from './circuit-breaker';
import { Logger } from './logger';

export class PfpCircuitBreaker {
    private breaker: CircuitBreaker;
    private readonly name: string;
    
    constructor(instanceName: string) {
        // Thresholds menores para PFP (mais sensível que API geral)
        const config: CircuitBreakerConfig = {
            failureThreshold: 5,   // Abre após 5 falhas (mais sensível que API geral que usa 15)
            successThreshold: 2,  // Recupera com 2 sucessos
            timeout: 30000        // 30s para tentar novamente
        };
        
        this.name = `PFP_${instanceName}`;
        this.breaker = new CircuitBreaker(this.name, config);
        
        Logger.info('PfpCircuitBreaker', `Inicializado para ${instanceName}`, { 
            action: 'init',
            metadata: { threshold: config.failureThreshold, timeout: config.timeout }
        });
    }
    
    /**
     * Executa operação de fetch PFP com proteção de circuit breaker
     * Se circuit estiver OPEN, retorna null silenciosamente
     */
    async executePfpFetch<T>(operation: () => Promise<T>): Promise<T | null> {
        const state = this.breaker.getState();
        
        if (state === CircuitState.OPEN) {
            Logger.debug('PfpCircuitBreaker', `Circuit OPEN - rejeitando requisição PFP`, { action: 'reject' });
            return null;
        }
        
        try {
            const result = await this.breaker.execute(operation);
            return result;
        } catch (error: any) {
            Logger.warn('PfpCircuitBreaker', `Falha no fetch PFP - circuit pode abrir`, { 
                action: 'failure',
                metadata: { error: error.message, failures: this.breaker.getFailures() }
            });
            // Retorna null para não bloquear o sync inteiro
            return null;
        }
    }
    
    getState(): CircuitState {
        return this.breaker.getState();
    }
    
    getFailures(): number {
        return this.breaker.getFailures();
    }
    
    /**
     * Reseta o circuit breaker manualmente
     */
    reset(): void {
        this.breaker.reset();
        Logger.info('PfpCircuitBreaker', `Resetado manualmente`, { action: 'reset' });
    }
}

// Singleton para reuse por instância
const pfpBreakers = new Map<string, PfpCircuitBreaker>();

/**
 * Obtém ou cria um circuit breaker de PFP para uma instância específica
 */
export function getPfpCircuitBreaker(instanceName: string): PfpCircuitBreaker {
    if (!pfpBreakers.has(instanceName)) {
        pfpBreakers.set(instanceName, new PfpCircuitBreaker(instanceName));
    }
    return pfpBreakers.get(instanceName)!;
}

/**
 * Obtém todos os circuit breakers de PFP (para monitoramento)
 */
export function getAllPfpCircuitBreakers(): Map<string, PfpCircuitBreaker> {
    return pfpBreakers;
}

/**
 * Remove um circuit breaker de PFP (para cleanup)
 */
export function removePfpCircuitBreaker(instanceName: string): void {
    pfpBreakers.delete(instanceName);
    Logger.info('PfpCircuitBreaker', `Removido`, { action: 'remove' });
}
