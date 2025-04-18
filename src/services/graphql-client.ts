import { Client, cacheExchange, fetchExchange } from "urql"
import { GATEWAY_GRAPHQL } from "@/config/gateway"

export const goldsky = new Client({
  url: GATEWAY_GRAPHQL,
  exchanges: [cacheExchange, fetchExchange],
})

// export const arweaveNet = new Client({
//   url: "https://arweave.net/graphql",
//   exchanges: [cacheExchange, fetchExchange],
// })
