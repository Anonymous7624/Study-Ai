/**
 * Google Docs API integration.
 * Fetches document content as structured text.
 */

export async function getDocumentContent(
  documentId: string,
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const body = data.body?.content;

  if (!body || !Array.isArray(body)) return "";

  const extractText = (elements: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }>) => {
    let text = "";
    for (const el of elements) {
      const para = el.paragraph;
      if (!para?.elements) continue;
      for (const run of para.elements) {
        const content = run.textRun?.content;
        if (content) text += content;
      }
    }
    return text;
  };

  return extractText(body);
}
