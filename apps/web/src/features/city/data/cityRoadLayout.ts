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
    from: { tileX: 1, tileY: 4 },
    to: { tileX: 3, tileY: 3 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "financial-hall-to-city-exchange",
    from: { tileX: 3, tileY: 3 },
    to: { tileX: 5, tileY: 2 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "financial-hall-to-income-park",
    from: { tileX: 3, tileY: 3 },
    to: { tileX: 4, tileY: 5 },
    width: MAIN_ROAD_WIDTH,
    kind: "main",
  },
  {
    id: "income-park-to-real-estate-center",
    from: { tileX: 4, tileY: 5 },
    to: { tileX: 6, tileY: 4 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "income-park-to-mentor-tower",
    from: { tileX: 4, tileY: 5 },
    to: { tileX: 7, tileY: 2 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "financial-school-to-financial-hall",
    from: { tileX: 1, tileY: 2 },
    to: { tileX: 3, tileY: 3 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
  {
    id: "real-estate-center-to-city-exchange",
    from: { tileX: 6, tileY: 4 },
    to: { tileX: 5, tileY: 2 },
    width: SECONDARY_ROAD_WIDTH,
    kind: "secondary",
  },
];
