import { Application, extend } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import {
  CITY_BUILDING_POSITIONS,
  CITY_GRID_HEIGHT,
  CITY_GRID_WIDTH,
  CITY_SCENE_HEIGHT,
  CITY_SCENE_WIDTH,
} from "../pixi/cityScene.constants.js";
import {
  getBuildingPlaceholderSprite,
  getBuildingSprite,
  getBuildingSpriteScale,
  GROUND_TILE_ASSET,
} from "../pixi/citySprites.js";
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
          <span className="section-kicker">Mapa isometrico</span>
          <h2>Cidade Fortuna em evolucao</h2>
          <p>
            Os predios refletem os mesmos dados educativos dos cards, em tres
            estagios visuais: fundacao, crescimento e maturidade.
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
  const groundTexture = usePixiTexture(GROUND_TILE_ASSET);
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
  const texture = usePixiTexture(
    getBuildingSprite(building.id, building.level),
    getBuildingPlaceholderSprite(building.id, building.level),
    true,
  );
  const [isHovered, setIsHovered] = useState(false);
  const baseScale = getBuildingSpriteScale(building.level);
  const stateScale = building.status === "locked" ? 0.9 : 1;
  const hoverScale = isHovered ? 1.05 : 1;
  const spriteScale = baseScale * stateScale * hoverScale;
  const handlePointerTap = useCallback(() => {
    onBuildingClick(building);
  }, [building, onBuildingClick]);

  return (
    <pixiContainer x={screenPosition.x} y={screenPosition.y + 12}>
      <pixiGraphics
        draw={(graphics) => {
          graphics.clear();
          graphics.ellipse(0, 0, 58 * stateScale, 18 * stateScale);
          graphics.fill({ color: 0x17202f, alpha: building.status === "locked" ? 0.1 : 0.16 });
        }}
      />
      <pixiSprite
        texture={texture}
        anchor={{ x: 0.5, y: 1 }}
        eventMode="static"
        cursor="pointer"
        onPointerTap={handlePointerTap}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        scale={spriteScale}
        y={-4}
        alpha={building.status === "locked" ? 0.76 : 1}
      />
      <pixiText
        text={building.name}
        x={0}
        y={18}
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

function usePixiTexture(
  assetPath: string,
  fallbackAssetPath?: string,
  removeLightBackground = false,
): Texture {
  const [texture, setTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    let isMounted = true;

    async function loadTexture() {
      try {
        const loadedTexture = removeLightBackground
          ? await loadTextureWithTransparentBackground(assetPath)
          : await Assets.load<Texture>(assetPath);
        if (isMounted) {
          setTexture(loadedTexture);
        }
      } catch {
        if (!fallbackAssetPath) {
          return;
        }

        const fallbackTexture = removeLightBackground
          ? await loadTextureWithTransparentBackground(fallbackAssetPath)
          : await Assets.load<Texture>(fallbackAssetPath);
        if (isMounted) {
          setTexture(fallbackTexture);
        }
      }
    }

    setTexture(Texture.EMPTY);
    void loadTexture();

    return () => {
      isMounted = false;
    };
  }, [assetPath, fallbackAssetPath, removeLightBackground]);

  return texture;
}

async function loadTextureWithTransparentBackground(assetPath: string): Promise<Texture> {
  const image = await loadImage(assetPath);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return Assets.load<Texture>(assetPath);
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  removeConnectedLightBackground(imageData);
  context.putImageData(imageData, 0, 0);

  return Texture.from(canvas);
}

function loadImage(assetPath: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Nao foi possivel carregar ${assetPath}`));
    image.src = assetPath;
  });
}

function removeConnectedLightBackground(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let readIndex = 0;
  let writeIndex = 0;

  function enqueue(pixelIndex: number) {
    if (!visited[pixelIndex]) {
      visited[pixelIndex] = 1;
      queue[writeIndex] = pixelIndex;
      writeIndex += 1;
    }
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (readIndex < writeIndex) {
    const pixelIndex = queue[readIndex];
    readIndex += 1;

    const dataIndex = pixelIndex * 4;
    if (!isLightBackgroundPixel(data, dataIndex)) {
      continue;
    }

    data[dataIndex + 3] = 0;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y < height - 1) enqueue(pixelIndex + width);
  }
}

function isLightBackgroundPixel(data: Uint8ClampedArray, dataIndex: number): boolean {
  const red = data[dataIndex];
  const green = data[dataIndex + 1];
  const blue = data[dataIndex + 2];
  const alpha = data[dataIndex + 3];
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const average = (red + green + blue) / 3;

  return alpha > 0 && average >= 220 && maxChannel - minChannel <= 18;
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
