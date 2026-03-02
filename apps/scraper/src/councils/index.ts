import type { CouncilScraperConfig } from "./types";
import { towerHamletsConfig } from "./tower-hamlets";

export const councilConfigs: Record<string, CouncilScraperConfig> = {
  "tower-hamlets": towerHamletsConfig,
};

export * from "./types";
