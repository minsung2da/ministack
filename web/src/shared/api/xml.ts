/**
 * Shared XML parsing utilities for EC2 Query protocol responses.
 * All EC2 API responses are XML — these helpers extract data safely.
 */

/**
 * Parses an XML string into a DOM Document.
 */
export function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

/**
 * Extracts the text content of the first element matching `tag`
 * within `el`. Returns empty string if the tag is not found.
 */
export function getText(el: Element, tag: string): string {
  return el.getElementsByTagName(tag)[0]?.textContent ?? ''
}

/**
 * Returns all `<item>` elements within the FIRST element matching `setTag`
 * inside `parent`. Scoping to the first matching set avoids the cross-nesting
 * pitfall where `getElementsByTagName('item')` from the document root returns
 * items from ALL sibling sets.
 *
 * Returns `[]` if `setTag` is not found.
 */
export function getItems(parent: Document | Element, setTag: string): Element[] {
  const set = parent.getElementsByTagName(setTag)[0]
  if (!set) return []
  return Array.from(set.getElementsByTagName('item'))
}

/**
 * Alias for `getItems` — same behaviour but exported for cases where the
 * caller has already narrowed `parent` to a specific scope.
 */
export function getAllItemsFromSet(parent: Document | Element, setTag: string): Element[] {
  return getItems(parent, setTag)
}

/**
 * Searches the `tagSet` child of `el` for an `<item>` whose `<key>` text is
 * `"Name"`, then returns its `<value>` text. Returns `''` if no Name tag
 * exists.
 */
export function getNameTag(el: Element): string {
  const tagSet = el.getElementsByTagName('tagSet')[0]
  if (!tagSet) return ''
  const items = Array.from(tagSet.getElementsByTagName('item'))
  for (const item of items) {
    const key = item.getElementsByTagName('key')[0]?.textContent
    if (key === 'Name') {
      return item.getElementsByTagName('value')[0]?.textContent ?? ''
    }
  }
  return ''
}
