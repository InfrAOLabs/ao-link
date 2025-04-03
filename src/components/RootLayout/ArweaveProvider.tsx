import { ArweaveWalletKit } from "@arweave-wallet-kit/react"
import WanderStrategy from "@arweave-wallet-kit/wander-strategy"
import { useColorScheme } from "@mui/material"
import AoSyncStrategy from "@vela-ventures/aosync-strategy"
import React from "react"

import { MainFontFF } from "./fonts"

export function ArweaveProvider({ children }: { children: React.ReactNode }) {
  const { mode = "dark" } = useColorScheme()

  return (
    <ArweaveWalletKit
      config={{
        permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
        ensurePermissions: true,
        strategies: [new WanderStrategy(), new AoSyncStrategy()],
        appInfo: {
          name: "AoLink",
        },
      }}
      theme={{
        displayTheme: mode === "dark" ? "dark" : "light",
        radius: "none",
        accent: {
          r: 76,
          g: 175,
          b: 81,
        },
      }}
    >
      {children}
    </ArweaveWalletKit>
  )
}
