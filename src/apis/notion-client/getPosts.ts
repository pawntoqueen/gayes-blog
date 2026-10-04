import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  if (!id) {
    console.warn("NOTION_PAGE_ID is missing or not configured.")
    return []
  }

  try {
    const api = new NotionAPI()
    const fetchOptions = {
      gotOptions: {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9"
        }
      }
    }
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

    // Construct Data
    let pageIds = getAllPageIds(response)

    // Fallback: If getAllPageIds returned nothing, extract page IDs directly from block map
    if ((!pageIds || pageIds.length === 0) && block) {
      pageIds = Object.keys(block).filter((bId) => {
        const b = (block[bId]?.value as any)?.value ?? block[bId]?.value
        return b && (b.type === "page" || b.type === "collection_view_page") && bId !== id
      })
    }

    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i]
      try {
        const properties = (await getPageProperties(pageId, block, schema)) || {}
        const pageBlockValue = (block[pageId]?.value as any)?.value ?? block[pageId]?.value
        if (!pageBlockValue) continue

        properties.createdTime = new Date(
          pageBlockValue?.created_time
        ).toString()
        properties.fullWidth =
          (pageBlockValue?.format as any)?.page_full_width ?? false

        // Ensure title and slug fallback if lowercased
        properties.title = properties.title || properties.Title || properties.name || properties.Name || ""
        properties.slug = properties.slug || properties.Slug || pageId

        data.push(properties)
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
