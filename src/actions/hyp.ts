import type { Action } from '../types'

/**
 * Pouet
 */
const action: Action = ({ value }) => {
	if (!value) {
		return undefined
	}
	const data = JSON.parse(value) as object

	return data
}

export default action
