import type { Action } from '../types'
import { locate } from '../utils'

/**
 * Pouet
 */
const action: Action = ({ value, origin, hyperions }) => {
	if (!value) {
		throw new Error('can not trigger hyperion item if it does not exists')
	}

	const hypItem = locate(origin, value)

	if (!hypItem) {
		throw new Error(`Could not find Hyperion element using the query (${value})`)
	}

	hyperions.trigger(hypItem)
}

export default action
