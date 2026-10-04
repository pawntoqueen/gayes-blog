import { NotionAPI } from "notion-client"

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const fetchOptions = {
    gotOptions: {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9"
      }
    }
  }
  const recordMap = await api.getPage(pageId, fetchOptions)
  return recordMap
}
