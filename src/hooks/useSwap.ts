import { useEffect, useState } from "react"

import { getSwap, Swap } from "@/services/swap"

export const useSwap = (msgId: string) => {
  const [swap, setSwap] = useState<Swap | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!msgId) return

    setIsLoading(true)

    getSwap(msgId)
      .then((s) => {
        setSwap(s)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch swap:", err)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [msgId])

  return { swap, isLoading }
}
