import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "../components/ErrorState.js";
import { Layout } from "../components/Layout.js";
import { LoadingState } from "../components/LoadingState.js";
import { OrderModal, type OrderMode } from "../components/OrderModal.js";
import type { ScreenKey } from "../components/NavigationTabs.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { HistoryPage } from "../pages/HistoryPage.js";
import { MarketPage } from "../pages/MarketPage.js";
import { WalletPage } from "../pages/WalletPage.js";
import { getAssets } from "../services/assetApi.js";
import { collectIncome } from "../services/incomeApi.js";
import { refreshMockPrices } from "../services/marketApi.js";
import { buyAsset, sellAsset } from "../services/orderApi.js";
import { createPlayer, getPlayerSummary } from "../services/playerApi.js";
import { getTransactions } from "../services/transactionApi.js";
import {
  getPortfolio,
  getPortfolioAllocation,
  getWallet,
} from "../services/walletApi.js";
import type { Asset } from "../types/asset.js";
import type { PlayerSummary } from "../types/player.js";
import type { Transaction } from "../types/transaction.js";
import type { Portfolio, PortfolioAllocation, Position } from "../types/wallet.js";

const playerStorageKey = "fortuna.playerId";

type OrderDraft = {
  mode: OrderMode;
  asset: Asset;
  position?: Position;
};

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("dashboard");
  const [playerId, setPlayerId] = useState(() =>
    localStorage.getItem(playerStorageKey),
  );
  const [summary, setSummary] = useState<PlayerSummary>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>();
  const [allocation, setAllocation] = useState<PortfolioAllocation>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [orderDraft, setOrderDraft] = useState<OrderDraft>();
  const [quantityInput, setQuantityInput] = useState("1");

  const loadData = useCallback(async () => {
    if (!playerId) {
      setSummary(undefined);
      setPortfolio(undefined);
      setAllocation(undefined);
      setTransactions([]);
      setAssets([]);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const [
        nextSummary,
        nextAssets,
        nextWallet,
        nextPortfolio,
        nextAllocation,
        nextTransactions,
      ] = await Promise.all([
        getPlayerSummary(playerId),
        getAssets(),
        getWallet(playerId),
        getPortfolio(playerId),
        getPortfolioAllocation(playerId),
        getTransactions(playerId),
      ]);
      setSummary({
        ...nextSummary,
        availableCashCents: nextWallet.balanceCents,
      });
      setAssets(nextAssets);
      setPortfolio(nextPortfolio);
      setAllocation(nextAllocation);
      setTransactions(nextTransactions);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel carregar a experiencia financeira.",
      );
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const positionsByAssetId = useMemo(
    () => new Map((portfolio?.positions ?? []).map((position) => [position.assetId, position])),
    [portfolio],
  );

  async function handleCreatePlayer() {
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const player = await createPlayer("Jogador Fortuna");
      localStorage.setItem(playerStorageKey, player.id);
      setPlayerId(player.id);
      setSuccess("Jogador criado. Agora voce pode explorar mercado, carteira e historico.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Nao foi possivel criar jogador.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetPlayer() {
    localStorage.removeItem(playerStorageKey);
    setPlayerId(null);
    setSummary(undefined);
    setPortfolio(undefined);
    setAllocation(undefined);
    setTransactions([]);
    setSuccess("Jogador local removido. Crie ou carregue outro jogador para continuar.");
  }

  function openBuy(asset: Asset) {
    setOrderDraft({
      mode: "buy",
      asset,
      position: positionsByAssetId.get(asset.id),
    });
    setQuantityInput("1");
    setError(undefined);
  }

  function openSell(position: Position) {
    const asset =
      assets.find((candidate) => candidate.id === position.assetId) ??
      positionToAsset(position);
    setOrderDraft({ mode: "sell", asset, position });
    setQuantityInput("1");
    setError(undefined);
  }

  async function handleConfirmOrder(quantity: number) {
    if (!playerId || !orderDraft) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      if (orderDraft.mode === "buy") {
        await buyAsset(playerId, orderDraft.asset.id, quantity);
        setSuccess(
          "Compra registrada. Acompanhe como essa posicao altera risco, liquidez e diversificacao.",
        );
      } else {
        await sellAsset(playerId, orderDraft.asset.id, quantity);
        setSuccess(
          "Venda registrada. Revise se o saldo liberado apoia reserva, objetivos ou rebalanceamento.",
        );
      }
      setOrderDraft(undefined);
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "A ordem foi recusada.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCollectIncome() {
    if (!playerId) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await collectIncome(playerId);
      setSuccess(
        "Rendimentos simulados foram adicionados ao saldo. Em investimentos reais, prazos, impostos e liquidez podem variar.",
      );
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel coletar rendimento agora.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshMarket() {
    setRefreshingMarket(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await refreshMockPrices();
      setSuccess("Mercado atualizado para fins educacionais.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "O mercado nao pode ser atualizado no momento.",
      );
    } finally {
      setRefreshingMarket(false);
    }
  }

  const currentPage = !playerId ? (
    <DashboardPage
      collecting={submitting}
      onCreatePlayer={handleCreatePlayer}
      onGoToMarket={() => setActiveScreen("market")}
      onCollectIncome={handleCollectIncome}
    />
  ) : activeScreen === "market" ? (
    <MarketPage
      assets={assets}
      refreshing={refreshingMarket}
      onBuy={openBuy}
      onRefreshMarket={handleRefreshMarket}
    />
  ) : activeScreen === "wallet" ? (
    <WalletPage
      availableCashCents={summary?.availableCashCents ?? 0}
      portfolio={portfolio}
      allocation={allocation}
      onSell={openSell}
    />
  ) : activeScreen === "history" ? (
    <HistoryPage transactions={transactions} />
  ) : (
    <DashboardPage
      summary={summary}
      portfolio={portfolio}
      allocation={allocation}
      collecting={submitting}
      onCreatePlayer={handleCreatePlayer}
      onGoToMarket={() => setActiveScreen("market")}
      onCollectIncome={handleCollectIncome}
    />
  );

  return (
    <Layout
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      onResetPlayer={handleResetPlayer}
    >
      {success ? (
        <div className="state state-success" role="status">
          <strong>Atualizado</strong>
          <p>{success}</p>
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}
      {loading ? (
        <LoadingState message="Carregando dados financeiros da API..." />
      ) : (
        currentPage
      )}
      {orderDraft ? (
        <OrderModal
          mode={orderDraft.mode}
          asset={orderDraft.asset}
          position={orderDraft.position}
          availableCashCents={summary?.availableCashCents ?? 0}
          quantityInput={quantityInput}
          submitting={submitting}
          onQuantityChange={setQuantityInput}
          onCancel={() => setOrderDraft(undefined)}
          onConfirm={handleConfirmOrder}
        />
      ) : null}
    </Layout>
  );
}

function positionToAsset(position: Position): Asset {
  return {
    id: position.assetId,
    symbol: position.symbol,
    name: position.name,
    type: position.assetType,
    currentPriceCents: position.currentPriceCents,
    variationBps: 0,
    riskLevel: "NONE",
    liquidity: "SIMULATED",
    description: "Ativo presente na carteira simulada.",
    isActive: true,
    isMocked: true,
    updatedAt: new Date().toISOString(),
  };
}
