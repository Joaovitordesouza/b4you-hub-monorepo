
# Plano do Projeto

## Visão Geral
O projeto é um Hub de gestão para creators (B4You Hub), integrando CRM, automação de WhatsApp (Evolution API), e gestão de cursos (Kiwify). O objetivo atual é corrigir erros de tipagem reportados pelo usuário.

## Objetivo Principal
Corrigir erro de tipagem no arquivo `pages/ConnectHub.tsx` relacionado à passagem de props para o componente `DeviceCard`.

## Escopo Funcional
- Correção de Tipagem em `pages/ConnectHub.tsx`.

## Regras de Negócio
- `DeviceCard` requer `onOpenChat` com assinatura `(id: string) => void`.
- `handleOpenChat` deve ser compatível.

## Arquitetura Geral
- React Frontend com Firebase e TypeScript.
- Arquivos de páginas e componentes separados.

## Módulos do Sistema
- ConnectHub (Gestão de Instâncias WhatsApp).

## Premissas Técnicas
- TypeScript strict mode pode estar ativo.

## Estratégia de Evolução Incremental
1. Ajustar a assinatura de `handleOpenChat` em `pages/ConnectHub.tsx`.
