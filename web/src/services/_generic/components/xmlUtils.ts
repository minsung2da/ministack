/**
 * DOMParser-based XML helpers for aws-query descriptors (IAM / STS).
 *
 * Intentionally does NOT pull in fast-xml-parser (Registry Safety: zero new
 * npm dependencies). AWS-Query responses are small and shallow; a simple
 * tagName walker is sufficient.
 */

export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const errNode = doc.querySelector('parsererror')
  if (errNode) {
    throw new Error(`XML parse error: ${errNode.textContent ?? 'unknown'}`)
  }
  return doc
}

export function selectText(node: Element, tag: string): string {
  const child = node.getElementsByTagName(tag)[0]
  return child?.textContent?.trim() ?? ''
}

export function selectAll(
  root: Document | Element,
  path: string,
): Element[] {
  const parts = path.split('/').filter(Boolean)
  const start =
    'documentElement' in root ? root.documentElement : (root as Element)
  if (!start) return []
  let nodes: Element[] = [start]
  for (const part of parts) {
    nodes = nodes.flatMap((n) =>
      Array.from(n.getElementsByTagName(part)).filter(
        (c) => c.parentElement === n,
      ),
    )
  }
  return nodes
}

/**
 * Walks <resultTag><collectionTag><member>...</member>...</collectionTag>.
 * For each <member>, extracts the listed `fields` as a flat string record.
 */
export function selectMembers(
  doc: Document,
  resultTag: string,
  collectionTag: string,
  fields: string[],
): Array<Record<string, string>> {
  const result = doc.getElementsByTagName(resultTag)[0]
  if (!result) return []
  const coll = result.getElementsByTagName(collectionTag)[0]
  if (!coll) return []
  return Array.from(coll.getElementsByTagName('member')).map((m) => {
    const row: Record<string, string> = {}
    for (const f of fields) row[f] = selectText(m, f)
    return row
  })
}
