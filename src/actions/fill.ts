import type { Action } from '../types'
import { locate } from '../utils'

/**
 * Pouet
 */
const action: Action = ({ hyperions, value, options = {}, data, origin }) => {
	const el = locate(origin, value!)

	if (!el) {
		return
	}

	if (typeof options.keepDataAttributes === 'undefined') {
		options.keepDataAttributes = true
	}

	hyperions.fill(el, data ?? {}, { ...options, path: [] }, { skipSelf: origin === el })
}

export default action
