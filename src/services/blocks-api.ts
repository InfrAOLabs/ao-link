import { gql } from "urql"

import { goldsky } from "./graphql-client"
import { ArweaveBlock, BlocksResponse } from "@/types"
import { parseArweaveBlock } from "@/utils/arweave-utils"

const AO_NETWORK_IDENTIFIER = '{ name: "Data-Protocol", values: ["ao"] }'

const blocksQuery = gql`
  query ($limit: Int!, $sortOrder: SortOrder!, $cursor: String) {
    blocks(sort: $sortOrder, first: $limit, after: $cursor) {
      edges {
        cursor
        node {
          id
          height
          previous
          timestamp
        }
      }
    }
  }
`

export async function getBlocks(
  limit = 100,
  cursor = "",
  ascending: boolean,
): Promise<ArweaveBlock[]> {
  try {
    const result = await goldsky
      .query<BlocksResponse>(blocksQuery, {
        limit,
        sortOrder: ascending ? "HEIGHT_ASC" : "HEIGHT_DESC",
        cursor,
      })
      .toPromise()
    const { data } = result

    if (!data) return []

    const { edges } = data.blocks
    const events = edges.map(parseArweaveBlock)

    return events
  } catch (error) {
    return []
  }
}
