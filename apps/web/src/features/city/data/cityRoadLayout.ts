export type CityRoadSegment = {
  id: string;
  from: { tileX: number; tileY: number };
  to: { tileX: number; tileY: number };
  width: number;
  kind: "main" | "secondary";
};

const MAIN_ROAD_WIDTH = 34;
const SECONDARY_ROAD_WIDTH = 28;

export const cityRoadSegments: CityRoadSegment[] = [
  {
    id: "reserve-bank-to-financial-hall",
    from: { tileX: 2.15, tileY: 3.35 },
    to: { tileX: 4.1, tileY: 2.78 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "financial-hall-to-city-exchange",
    from: { tileX: 4.1, tileY: 2.78 },
    to: { tileX: 5.25, tileY: 1.12 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "financial-hall-to-income-park",
    from: { tileX: 4.1, tileY: 2.78 },
    to: { tileX: 4.9, tileY: 5.04 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "income-park-to-real-estate-center",
    from: { tileX: 4.9, tileY: 5.04 },
    to: { tileX: 6.55, tileY: 4.02 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "income-park-to-mentor-tower",
    from: { tileX: 4.9, tileY: 5.04 },
    to: { tileX: 7.45, tileY: 2.2 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "financial-school-to-financial-hall",
    from: { tileX: 2.05, tileY: 5.38 },
    to: { tileX: 4.1, tileY: 2.78 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "real-estate-center-to-city-exchange",
    from: { tileX: 6.55, tileY: 4.02 },
    to: { tileX: 5.25, tileY: 1.12 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
];
