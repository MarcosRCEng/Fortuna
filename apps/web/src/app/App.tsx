import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ErrorState } from "../components/ErrorState.js";
import { Layout } from "../components/Layout.js";
import { LoadingState } from "../components/LoadingState.js";
import { OrderModal, type OrderMode } from "../components/OrderModal.js";
import type { ScreenKey } from "../components/NavigationTabs.js";
import { CityPage } from "../features/city/CityPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { HistoryPage } from "../pages/HistoryPage.js";
import { MarketPage } from "../pages/MarketPage.js";
import { MissionsPage } from "../pages/MissionsPage.js";
import { WalletPage } from "../pages/WalletPage.js";
import {
  getCurrentSession,
  loginWithGoogle,
  logout,
  updateCurrentPlayer,
  type AuthSession,
} from "../services/authApi.js";
import { getAssets } from "../services/assetApi.js";
import { getCityState, type CityStateResponse } from "../services/cityApi.js";
import { collectIncome } from "../services/incomeApi.js";
import { refreshMockPrices } from "../services/marketApi.js";
import {
  getMissions,
  initializeMissions,
  type PlayerMission,
  viewAssetEducation,
} from "../services/missionApi.js";
import { buyAsset, sellAsset } from "../services/orderApi.js";
import {
  getPlayerSummary,
  markMentorMessageAsRead,
} from "../services/playerApi.js";
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

const screenPaths: Record<ScreenKey, string> = {
  dashboard: "/",
  market: "/market",
  wallet: "/wallet",
  missions: "/missions",
  history: "/history",
  city: "/city",
};

function screenFromPath(pathname: string): ScreenKey {
  const match = Object.entries(screenPaths).find(([, path]) => path === pathname);
  return match?.[0] as ScreenKey | undefined ?? "dashboard";
}

type OrderDraft = {
  mode: OrderMode;
  asset: Asset;
  position?: Position;
};

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() =>
    screenFromPath(window.location.pathname),
  );
  const [session, setSession] = useState<AuthSession>();
  const [authLoading, setAuthLoading] = useState(true);
  const [summary, setSummary] = useState<PlayerSummary>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>();
  const [allocation, setAllocation] = useState<PortfolioAllocation>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [missions, setMissions] = useState<PlayerMission[]>([]);
  const [cityState, setCityState] = useState<CityStateResponse>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [orderDraft, setOrderDraft] = useState<OrderDraft>();
  const [quantityInput, setQuantityInput] = useState("1");
  const playerId = session ? "me" : null;

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      setAuthLoading(true);
      try {
        const current = await getCurrentSession();
        if (active) {
          setSession(current);
        }
      } catch {
        if (active) {
          setSession(undefined);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!playerId) {
      setSummary(undefined);
      setPortfolio(undefined);
      setAllocation(undefined);
      setTransactions([]);
      setMissions([]);
      setCityState(undefined);
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
        nextMissions,
        nextCityState,
      ] = await Promise.all([
        getPlayerSummary(playerId),
        getAssets(),
        getWallet(playerId),
        getPortfolio(playerId),
        getPortfolioAllocation(playerId),
        getTransactions(playerId),
        getMissions(playerId).catch(() => initializeMissions(playerId)),
        getCityState(playerId),
      ]);
      setSummary({
        ...nextSummary,
        availableCashCents: nextWallet.balanceCents,
      });
      setAssets(nextAssets);
      setPortfolio(nextPortfolio);
      setAllocation(nextAllocation);
      setTransactions(nextTransactions);
      setMissions(nextMissions.missions);
      setCityState(nextCityState);
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

  useEffect(() => {
    function handlePopState() {
      setActiveScreen(screenFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = useCallback((screen: ScreenKey) => {
    setActiveScreen(screen);
    const path = screenPaths[screen];
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  }, []);

  const positionsByAssetId = useMemo(
    () => new Map((portfolio?.positions ?? []).map((position) => [position.assetId, position])),
    [portfolio],
  );

  async function handleLogout() {
    setSubmitting(true);
    setError(undefined);
    try {
      await logout();
    } finally {
      setSession(undefined);
      setSummary(undefined);
      setPortfolio(undefined);
      setAllocation(undefined);
      setTransactions([]);
      setMissions([]);
      setCityState(undefined);
      setSubmitting(false);
    }
  }

  async function handleOnboardingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const player = await updateCurrentPlayer(onboardingName);
      setSession((current) =>
        current
          ? {
              ...current,
              player: {
                ...current.player,
                ...player,
              },
            }
          : current,
      );
      setOnboardingName("");
      await loadData();
      handleNavigate("dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel salvar seu nome de jogador.",
      );
    } finally {
      setSubmitting(false);
    }
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

  async function handleViewAssetEducation(asset: Asset) {
    if (!playerId) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await viewAssetEducation(playerId, asset.id);
      setSuccess(
        "Detalhes educativos registrados. Ativos de maior risco podem oscilar mais; entenda antes de comprar.",
      );
      await loadData();
      handleNavigate("missions");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel registrar o estudo do ativo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkMentorMessageAsRead() {
    if (!playerId || !summary?.mentorMessage) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await markMentorMessageAsRead(playerId, summary.mentorMessage.id);
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel marcar a mensagem como lida.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const needsOnboarding = Boolean(playerId && !session?.player.nickname);

  const currentPage = !playerId ? (
    <LoginPage onLogin={loginWithGoogle} />
  ) : needsOnboarding ? (
    <OnboardingPage
      value={onboardingName}
      submitting={submitting}
      onChange={setOnboardingName}
      onSubmit={handleOnboardingSubmit}
    />
  ) : activeScreen === "market" ? (
    <MarketPage
      assets={assets}
      refreshing={refreshingMarket}
      submitting={submitting}
      onBuy={openBuy}
      onViewEducation={handleViewAssetEducation}
      onRefreshMarket={handleRefreshMarket}
    />
  ) : activeScreen === "wallet" ? (
    <WalletPage
      availableCashCents={summary?.availableCashCents ?? 0}
      portfolio={portfolio}
      allocation={allocation}
      submitting={submitting}
      onSell={openSell}
    />
  ) : activeScreen === "history" ? (
    <HistoryPage transactions={transactions} />
  ) : activeScreen === "missions" ? (
    <MissionsPage
      missions={missions}
      submitting={submitting}
      onGoToMarket={() => handleNavigate("market")}
      onGoToWallet={() => handleNavigate("wallet")}
      onCollectIncome={handleCollectIncome}
    />
  ) : activeScreen === "city" ? (
    <CityPage
      summary={summary}
      cityState={cityState}
      portfolio={portfolio}
      allocation={allocation}
      transactions={transactions}
      missions={missions}
    />
  ) : (
    <DashboardPage
      summary={summary}
      portfolio={portfolio}
      allocation={allocation}
      collecting={submitting}
      onCreatePlayer={loginWithGoogle}
      onGoToMarket={() => handleNavigate("market")}
      onCollectIncome={handleCollectIncome}
      onMarkMentorMessageAsRead={handleMarkMentorMessageAsRead}
    />
  );

  return (
    <Layout
      activeScreen={activeScreen}
      onNavigate={handleNavigate}
      currentUser={session?.user}
      onLogout={handleLogout}
    >
      {authLoading ? (
        <LoadingState message="Restaurando sessao segura..." />
      ) : (
        <>
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
        </>
      )}
    </Layout>
  );
}

function OnboardingPage({
  value,
  submitting,
  onChange,
  onSubmit,
}: {
  value: string;
  submitting: boolean;
  onChange(value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}) {
  return (
    <section className="login-screen">
      <form className="login-panel" onSubmit={onSubmit}>
        <span className="section-kicker">Boas-vindas</span>
        <h1>Escolha seu nome de jogador</h1>
        <label className="field-label" htmlFor="player-nickname">
          Nome de jogador
        </label>
        <input
          id="player-nickname"
          className="text-input"
          type="text"
          minLength={3}
          maxLength={40}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
        >
          Comecar minha jornada
        </button>
      </form>
    </section>
  );
}

function LoginPage({ onLogin }: { onLogin(): void }) {
  return (
    <section className="login-screen">
      <div className="login-panel">
        <span className="section-kicker">Sessao segura</span>
        <h1>Entrar no Fortuna</h1>
        <p>Use sua conta Google para salvar seu progresso.</p>
        <button type="button" className="button button-primary" onClick={onLogin}>
          Continuar com Google
        </button>
        <p className="educational-note">
          O Fortuna e uma simulacao educativa. Nenhuma operacao real sera executada.
        </p>
      </div>
    </section>
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
