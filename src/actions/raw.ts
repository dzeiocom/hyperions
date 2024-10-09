import type { Action } from '../types'

/**
 * Pouet
 */
const action: Action = ({ log, options = {}, value }) => {
	if (!value) {
		return
	}
	const data = JSON.parse(value) as object
	log('Parsed JSON input', data)

	return {
		data: data
	}
}

export default action
