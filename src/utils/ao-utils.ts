import { DryRunResult, MessageResult } from "@/config/ao.Connection"

/**
 * Prettifies a message/dryrun result by parsing any stringified JSON found in the `Output.data` or `Messages[].Data` fields
 */
export function prettifyResult(json: MessageResult | DryRunResult): MessageResult | DryRunResult {
  if (json.Output?.data) {
    try {
      const parsed = JSON.parse(json.Output.data)
      json.Output.data = parsed
    } catch {
      console.log("Failed to parse Output.data")
    }
  }

  if (json.Messages) {
    json.Messages.forEach((message) => {
      if (message.Data) {
        try {
          const parsed = JSON.parse(message.Data)
          message.Data = parsed
        } catch {
          console.log("Failed to parse message.Data")
        }
      }
    })
  }

  return json
}
