import {
  calculateBalanceAfterBuy,
  calculateTradeTotalCents,
  type Cents,
} from "./money.js";
import type { Asset, Position } from "../services/types.js";

export interface OperationValidationResult {
  blocked: boolean;
  reason?: string;
}

export function validateBuyOperation(params: {
  asset: Asset;
  availableBalanceCents: Cents;
  quantity: number;
  marketUpdating: boolean;
}): OperationValidationResult {
  if (params.marketUpdating) {
    return {
      blocked: true,
      reason:
        "Os precos estao sendo atualizados. Aguarde antes de confirmar uma operacao.",
    };
  }

  if (!params.asset.isActive) {
    return {
      blocked: true,
      reason: "Este ativo esta indisponivel para operacoes no momento.",
    };
  }

  if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
    return {
      blocked: true,
      reason: "Informe uma quantidade inteira maior que zero.",
    };
  }

  const totalCents = calculateTradeTotalCents(
    params.asset.currentPriceCents,
    params.quantity,
  );

  if (calculateBalanceAfterBuy(params.availableBalanceCents, totalCents) < 0) {
    return {
      blocked: true,
      reason:
        "Voce ainda nao possui saldo suficiente para esta compra. Tente reduzir a quantidade ou aguarde novos rendimentos.",
    };
  }

  return { blocked: false };
}

export function validateSellOperation(params: {
  asset: Asset;
  position?: Position;
  quantity: number;
  marketUpdating: boolean;
}): OperationValidationResult {
  if (params.marketUpdating) {
    return {
      blocked: true,
      reason:
        "Os precos estao sendo atualizados. Aguarde antes de confirmar uma operacao.",
    };
  }

  if (!params.position || params.position.quantity <= 0) {
    return {
      blocked: true,
      reason: "Voce ainda nao possui posicao neste ativo para vender.",
    };
  }

  if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
    return {
      blocked: true,
      reason: "Informe uma quantidade inteira maior que zero.",
    };
  }

  if (params.quantity > params.position.quantity) {
    return {
      blocked: true,
      reason:
        "A quantidade informada e maior que sua posicao atual. Ajuste a venda para ate o total disponivel.",
    };
  }

  if (!params.asset.isActive) {
    return {
      blocked: true,
      reason: "Este ativo esta indisponivel para operacoes no momento.",
    };
  }

  return { blocked: false };
}
