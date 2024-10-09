import { objectMap } from '@dzeio/object-util'
import { PLACEMENTS } from '../consts'
import type { Action } from '../types'
import { betterSplit, locate } from '../utils'

// eslint-disable-next-line complexity
const action: Action = ({ hyperions, log, value, options = {}, origin, data = {} }) => {
	let [
		templateQuery,
		locationQuery = null,
		placement = 'inner'
	] = betterSplit(value)
	log(options, 'output: Template action detected', templateQuery, locationQuery, placement)

	// query the template
	const template = locate<HTMLTemplateElement>(origin, templateQuery)

	// validate it is a template
	if (!template || template.tagName !== 'TEMPLATE') {
		throw new Error(`Template not found using query(${templateQuery}) or ${template?.tagName} !== 'TEMPLATE'`)
	}

	log(options, 'output: Template found at', template)

	// handle locationQuery being set as placement
	if (locationQuery && PLACEMENTS.includes(locationQuery as 'inner')) {
		log(options, 'output: only two args found, moving locationQuery to placement')
		placement = locationQuery
		locationQuery = null
	}

	const isArray = origin && ('multiple' in origin.dataset || origin.hasAttribute('hyp:multiple'))
	const clones = isArray ? objectMap(data, (it) => hyperions.fillTemplate(template, it, options)) : [hyperions.fillTemplate(template, data, options)]

	const location = locationQuery ? locate(origin, locationQuery) : origin

	if (!location) {
		throw new Error('location not found :(')
	}

	log(options, 'output: placing new content with placement', placement)

	switch (placement) {
		case 'outer': // the clones replace the targetted element
			location.replaceWith(...clones)
			// TODO: might be buggy due to shit
			for (const clone of clones) {
				hyperions.emit('htmlChange', { newElement: clone })
			}
			break
		case 'inner': // the clones replace the childs of the targetted element
			// remove the current childs
			while (location.firstChild) {
				location.removeChild(location.firstChild)
			}
			// add each clones
			clones.forEach((it) => {
				const appendedChild = location.appendChild(it)
				hyperions.emit('htmlChange', { newElement: appendedChild })
			})
			break
		case 'append': {
			clones.forEach((it) => {
				location.appendChild(it)
				hyperions.emit('htmlChange', { newElement: it })
			})
			break
		}
		default:
			throw new Error(`couldn't place elements, placement invalid ${placement}`)
	}
}

export default action
