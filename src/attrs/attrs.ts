import type { Attribute } from "../types"
import { betterSplit } from "../utils"

const attr: Attribute = (ctx) => {
	const { hyperions, element: it, options, data } = ctx
	// get the raw attribute
	const attrRaw = it.getAttribute('hyp:attr') || it.getAttribute('hyp:attribute') || it.getAttribute('hyp:attributes') || it.dataset.attribute

	// handle data-input, data-output, ...
	for (const attr of Array.from(it.attributes)) {
		if (attr.name.startsWith('hyp:action')) {
			const value = attr.value
			it.setAttribute(attr.name, hyperions.parseValue(value, data, ctx) as string ?? value)
		}
	}

	// skip if not contains a data-attribute
	if (typeof attrRaw !== 'string') {
		return
	}

	// parse into an array
	const attrs: Array<string> = betterSplit(attrRaw)

	// loop through each attributes
	for (const attr of attrs) {
		hyperions.fillAttribute(it, attr, data, ctx)
	}

	// idk if necessary but remove the attributes from the final HTML
	if (!options?.keepDataAttributes) {
		it.removeAttribute('data-attribute')
	}

	return {
		continue: true
	}
}

export default attr
