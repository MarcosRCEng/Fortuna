import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Component, useCallback, useMemo, type ReactNode } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import {
  CITY_BUILDING_POSITIONS,
  CITY_GRID_HEIGHT,
  CITY_GRID_WIDTH,
  CITY_SCENE_HEIGHT,
  CITY_SCENE_WIDTH,
} from "../pixi/cityScene.constants.js";
import { getBuildingSprite, GROUND_TILE_ASSET } from "../pixi/citySprites.js";
import { isoToScreen } from "../pixi/isometric.js";

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

export function CityScene({
  buildings,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  return (
    <PixiFailureBoundary fallback={<CitySceneFallbackNotice />}>
      <section className="city-scene-panel" aria-label="Mapa visual da Cidade Fortuna">
        <div className="city-scene-copy">
          <span className="section-kicker">Mapa inicial</span>
          <h2>Cidade em construcao visual</h2>
          <p>
            O canvas abaixo apenas representa os dados ja calculados pelos cards.
            Clique em um predio para abrir os detalhes.
          </p>
        </div>
        <div className="city-scene-canvas">
          <Application
            width={CITY_SCENE_WIDTH}
            height={CITY_SCENE_HEIGHT}
            backgroundAlpha={0}
            antialias
          >
            <CitySceneContent buildings={buildings} onBuildingClick={onBuildingClick} />
          </Application>
        </div>
      </section>
    </PixiFailureBoundary>
  );
}

function CitySceneContent({
  buildings,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const groundTexture = useMemo(() => Texture.from(GROUND_TILE_ASSET), []);
  const orderedBuildings = useMemo(
    () =>
      buildings
        .filter((building) => Boolean(CITY_BUILDING_POSITIONS[building.id]))
        .sort((left, right) => {
          const leftPosition = CITY_BUILDING_POSITIONS[left.id];
          const rightPosition = CITY_BUILDING_POSITIONS[right.id];

          return leftPosition.tileX + leftPosition.tileY - (rightPosition.tileX + rightPosition.tileY);
        }),
    [buildings],
  );

  return (
    <pixiContainer>
      {Array.from({ length: CITY_GRID_WIDTH * CITY_GRID_HEIGHT }, (_, index) => {
        const tileX = index % CITY_GRID_WIDTH;
        const tileY = Math.floor(index / CITY_GRID_WIDTH);
        const position = isoToScreen(tileX, tileY);

        return (
          <pixiSprite
            key={`ground-${tileX}-${tileY}`}
            texture={groundTexture}
            x={position.x}
            y={position.y}
            anchor={0.5}
            alpha={0.9}
          />
        );
      })}

      {orderedBuildings.map((building) => (
        <CitySceneBuildingSprite
          key={building.id}
          building={building}
          onBuildingClick={onBuildingClick}
        />
      ))}
    </pixiContainer>
  );
}

function CitySceneBuildingSprite({
  building,
  onBuildingClick,
}: {
  building: CityBuildingViewModel;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const tilePosition = CITY_BUILDING_POSITIONS[building.id];
  const screenPosition = isoToScreen(tilePosition.tileX, tilePosition.tileY);
  const texture = useMemo(
    () => Texture.from(getBuildingSprite(building.id, building.level)),
    [building.id, building.level],
  );
  const handlePointerTap = useCallback(() => {
    onBuildingClick(building);
  }, [building, onBuildingClick]);

  return (
    <pixiContainer x={screenPosition.x} y={screenPosition.y - 36}>
      <pixiSprite
        texture={texture}
        anchor={0.5}
        eventMode="static"
        cursor="pointer"
        onPointerTap={handlePointerTap}
        scale={building.status === "locked" ? 0.92 : 1}
        alpha={building.status === "locked" ? 0.74 : 1}
      />
      <pixiText
        text={building.name}
        x={0}
        y={82}
        anchor={0.5}
        style={{
          align: "center",
          fill: "#17202f",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 13,
          fontWeight: "700",
          wordWrap: true,
          wordWrapWidth: 120,
        }}
      />
    </pixiContainer>
  );
}

function CitySceneFallbackNotice() {
  return (
    <section className="panel city-scene-fallback" aria-label="Fallback visual da Cidade Fortuna">
      <span className="section-kicker">Mapa indisponivel</span>
      <h2>Visualizacao em cards mantida</h2>
      <p>
        A camada grafica nao foi carregada agora. A grade abaixo continua
        representando a mesma evolucao da cidade.
      </p>
    </section>
  );
}

class PixiFailureBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Erro ao renderizar CityScene PixiJS", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
