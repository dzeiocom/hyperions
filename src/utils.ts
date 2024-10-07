// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function locate<Element extends HTMLElement = HTMLElement>(asker: HTMLElement | undefined, originalQuery: string): Element | undefined {
	let origin = document.body
	let query = originalQuery

	if (query === 'body') {
		return document.body as Element
	}

	if (query.startsWith('this')) {
		if (!asker) {
			throw new Error('no origin')
		}
		origin = asker
		query = query.slice(4)
	}

	if (query.length === 0) {
		return origin as Element
	}

	const res = origin.querySelector<Element>(query)
	if (!res) {
		throw new Error(`New location not found (origin: ${origin.tagName}, query: ${originalQuery})`)
	}

	return res
}

/**
 * A space centered split but it does not split if inside singlequotes
 *
 * ex: `'I am' the link` -> `['I am', 'the', 'link']`
 *
 * @param {string} input the string to split
 * @returns {Array<string>} the splitted string
 */
export function betterSplit(input = ''): Array<string> {
	const attrs: Array<string> = []
	let quoteCount = 0
	let current = ''
	const splitted = input.split('')
	for (let idx = 0; idx < splitted.length; idx++) {
		const char = splitted[idx]
		if (char === '\'' && splitted[idx - 1] !== '\\') {
			quoteCount += 1
			continue
		}
		if (char === ' ' && quoteCount % 2 === 0) {
			attrs.push(current)
			current = ''
			continue
		}
		if (char === '\'' && splitted[idx - 1] === '\\') {
			current = current.slice(0, current.length - 1)
		}
		current += char
	}
	if (current) {
		attrs.push(current)
	}

	return attrs
}
