import { connect } from "@permaweb/aoconnect/browser"

import { arIoCu } from "./services/arns-api"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const tokenCUs: Record<string, any> = {
  qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE: arIoCu,
}

export const defaultCu = connect({
  MODE: "legacy",
})

export function getTokenCu(tokenId: string) {
  return tokenCUs[tokenId] || defaultCu
}
