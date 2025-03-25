import { useEffect, useState } from "react"

import { getSwap, Swap } from "@/services/swap"

export const useSwap = (msgId: string) => {
  const [swap, setSwap] = useState<Swap | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentMsgId, setCurrentMsgId] = useState<string | null>(null)

  useEffect(() => {
    if (!msgId || msgId === currentMsgId) return

    setIsLoading(true)
    setCurrentMsgId(msgId)

    getSwap(msgId)
      .then((s) => {
        if (msgId === currentMsgId) {
          console.log(s)
          setSwap(s)
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch swap:", err)
        }
      })
      .finally(() => {
        if (msgId === currentMsgId) {
          setIsLoading(false)
        }
      })
  }, [msgId])

  return { swap, isLoading }
}
