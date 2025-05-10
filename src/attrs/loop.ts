import { objectGet } from "@dzeio/object-util";
import type { Attribute, AttributeContext } from "../types";

export const loop: Attribute = ({ element, log, path, hyperions, data, process }) => {
	const pAddition = element.getAttribute('hyp:loop') || element.dataset.loop
	if (!path) {
		log('fillLoop: loop has no "data-loop"')
		return
	}
	const localPath = [...path]

	Array.from(element.parentElement?.children || []).forEach(child => {
		if (child !== element && child.hasAttribute('hyp:copy')) {
			child.remove()
		}
	})

	// get the sub element
	if (pAddition !== 'this') {
		localPath.push(pAddition as string)
	}
	const subElement = objectGet(data, localPath)

	if (!Array.isArray(subElement)) {
		console.error('fillLoop: loop is not an array', subElement, localPath)
		return
	}

	for (let idx = 0; idx < subElement.length; idx++) {
		// update context with new value
		const indexedPath = [...localPath, idx]

		log('fillLoop: loop context', path)

		const child = element.cloneNode(true) as HTMLElement
		child.classList.remove('!hidden', 'hidden')

		const hto = { ...data, loop: { index: idx } }

		child.removeAttribute('hyp:loop')

		process(child, { path: indexedPath, data: hto })

		child.setAttribute('hyp:copy', 'true')
		element.after(child)
	}

	// hide it so that we can re-use it
	element.classList.add('!hidden')
}
