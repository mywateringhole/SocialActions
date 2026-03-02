import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@socialactions/api";

export const trpc = createTRPCReact<AppRouter>();
