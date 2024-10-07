import { objectClone } from '@dzeio/object-util'
import type { Action } from '../types'

/**
 * Pouet
 */
const run: Action = (ctx) => {

	// clone context
	const context = objectClone(ctx)
	context.prefix = `run:${ctx.value}`
	context.value = ''

	return ctx.hyperions.runAction(context)
}
export default run
