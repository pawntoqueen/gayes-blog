import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"
import got from "got"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

const DEFAULT_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
  "notion-client-version": "23.13.0.11"
}

export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  if (!id) {
    console.warn("NOTION_PAGE_ID is missing or not configured.")
    return []
  }

  try {
    const api = new NotionAPI()
    const fetchOptions = { gotOptions: { headers: DEFAULT_HEADERS } }
    const response = await api.getPage(id, fetchOptions)
    if (!response || !response.collection || !response.block) {
      return []
    }

    id = idToUuid(id)
    const collectionValue = Object.values(response.collection)[0]?.value as any
    const collection = collectionValue?.value ?? collectionValue
    const block = response.block
    const schema = collection?.schema

    const blockEntry = block[id]?.value as any
    const blockValue = blockEntry?.value ?? blockEntry
    const rawMetadata = blockValue

    // Check Type
    if (
      rawMetadata?.type !== "collection_view_page" &&
      rawMetadata?.type !== "collection_view"
    ) {
      return []
    }

    // Query Collection Data using modern reducer payload if collection_query is empty
    const collectionId = rawMetadata?.collection_id || Object.keys(response.collection)[0]
    const viewId = rawMetadata?.view_ids?.[0]

    if (collectionId && viewId) {
      try {
        const queryUrl = "https://www.notion.so/api/v3/queryCollection"
        const queryPayload = {
          collection: { id: collectionId },
          collectionView: { id: viewId },
          loader: {
            type: "reducer",
            reducers: {
              collection_group_results: {
                type: "results",
                limit: 100
              }
            },
            searchQuery: "",
            userTimeZone: "Europe/Istanbul"
          }
        }
        const queryRes = (await got.post(queryUrl, {
          json: queryPayload,
          headers: DEFAULT_HEADERS
        }).json()) as any

        if (queryRes?.recordMap) {
          if (queryRes.recordMap.block) {
            Object.assign(response.block, queryRes.recordMap.block)
          }
          if (queryRes.recordMap.collection) {
            Object.assign(response.collection, queryRes.recordMap.collection)
          }
          if (queryRes.result?.reducerResults?.collection_group_results) {
            response.collection_query = response.collection_query || {}
            response.collection_query[collectionId] = response.collection_query[collectionId] || {}
            response.collection_query[collectionId][viewId] = queryRes.result.reducerResults
          }
        }
      } catch (err) {
        console.error("Error querying Notion collection:", err)
      }
    }

    // Construct Data
    let pageIds = getAllPageIds(response)

    // Fallback: If getAllPageIds returned nothing, extract page IDs directly from block map
    if ((!pageIds || pageIds.length === 0) && response.block) {
      pageIds = Object.keys(response.block).filter((bId) => {
        const b = (response.block[bId]?.value as any)?.value ?? response.block[bId]?.value
        return b && (b.type === "page" || b.type === "collection_view_page") && bId !== id
      })
    }

    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i]
      try {
        const properties = (await getPageProperties(pageId, response.block, schema)) || {}
        const pageBlockValue = (response.block[pageId]?.value as any)?.value ?? response.block[pageId]?.value
        if (!pageBlockValue) continue

        properties.createdTime = new Date(
          pageBlockValue?.created_time
        ).toString()
        properties.fullWidth =
          (pageBlockValue?.format as any)?.page_full_width ?? false

        // Ensure title and slug fallback
        properties.title = properties.title || properties.Title || properties.name || properties.Name || ""
        properties.slug = properties.slug || properties.Slug || pageId

        // Strip any undefined values to avoid Next.js SSG serialization errors
        const cleanProperties = JSON.parse(JSON.stringify(properties))

        data.push(cleanProperties)
      } catch (err) {
        console.error(`Error processing post ${pageId}:`, err)
      }
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    return posts
  } catch (error) {
    console.error("Error fetching Notion posts:", error)
    return []
  }
}
