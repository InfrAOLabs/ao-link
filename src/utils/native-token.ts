import { TokenInfo } from "@/services/token-api"

export const nativeTokenInfo: TokenInfo = {
  processId: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc",
  denomination: 12,
  ticker: "AO",
  logo: "UkS-mdoiG8hcAClhKK8ch4ZhEzla0mCPDOix9hpdSFE",
  name: "AO",
}

export const tokenMirrors = {
  [nativeTokenInfo.processId]: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc",
}
