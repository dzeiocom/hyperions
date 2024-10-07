import type { Action } from '../types'
import { locate } from '../utils'

/**
 * Pouet
 */
const action: Action = ({ hyperions, log, value, origin }) => {
	log('output: Hyperion action detected')
	const hypItem = locate(origin, value!)

	if (!hypItem) {
		throw new Error(`Could not find Hyperion element using the query (${value})`)
	}

	log('output: running hyperion on element', hypItem)
	hyperions.trigger(hypItem)
}

export default action
