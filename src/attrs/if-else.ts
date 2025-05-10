import type { Attribute } from "../types";

const ifElse: Attribute = ({ element: item, hyperions, data, path, process }) => {
	const dataIf = item.getAttribute('hyp:if')
	const dataElse = item.getAttribute('hyp:else')

	if (dataIf) {
		const value = hyperions.findValue(dataIf, data, path)
		if (!value) {
			item.classList.add('!hidden')
		} else {
			item.classList.remove('!hidden', 'hidden')
			process(item, undefined, false)
		}
	}

	if (dataElse) {
		const value = hyperions.findValue(dataElse, data, path)
		if (!!value) {
			item.classList.add('!hidden')
		} else {
			item.classList.remove('!hidden', 'hidden')
			process(item, undefined, false)
		}
	}
}

export default ifElse
