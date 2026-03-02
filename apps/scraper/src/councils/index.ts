import type { CouncilScraperConfig } from "./types";
import { towerHamletsConfig } from "./tower-hamlets";
import { hackneyConfig } from "./hackney";
import { newhamConfig } from "./newham";
import { barkingDagenhamConfig } from "./barking-dagenham";
import { bromleyConfig } from "./bromley";

export const councilConfigs: Record<string, CouncilScraperConfig> = {
  "tower-hamlets": towerHamletsConfig,
  hackney: hackneyConfig,
  newham: newhamConfig,
  "barking-dagenham": barkingDagenhamConfig,
  bromley: bromleyConfig,
};

export * from "./types";
