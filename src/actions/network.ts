import { objectLoop } from '@dzeio/object-util'
import type { Action } from '../types'

/**
 * Pouet
 */
const action: Action = async ({ log, prefix, value, data = {}, origin }) => {
	if (!value) {
		throw new Error('missing URL')
	}
	const method = prefix.toUpperCase()

	log('put: using method', method)

	const url = new URL(value, !value.startsWith('http') ? window.location.href : undefined)
	let body: string | FormData | null = null

	if (method === 'GET') {
		log('input: adding params to URL, method is GET')
		objectLoop(data, (val, key) => {
			url.searchParams.set(key, val)
		})
	} else if (origin?.getAttribute('enctype') === 'multipart/form-data') {
		log('input: adding params to body as FormData, element has attribute enctype === multipart/form-data')
		const formData = new FormData()
		objectLoop(data, (val, key) => {
			if ((val as any) instanceof FileList) {
				formData.set(key, val[0])
			} else {
				formData.set(key, val)
			}
		})
		body = formData
	} else {
		log('input: adding params to body as JSON')
		body = JSON.stringify(data)
	}

	// do the request
	log('input: fetching', url.toString(), 'with method', method, 'and body', body)
	const res = await fetch(url, {
		method: method,
		body: body
	})

	// handle if the request does not succeed
	if (res.status >= 400) {
		throw new Error(`request returned a ${res.status} error code :(`)
	}

	// transform the response into JSON
	return await res.json() as object
}

export default action
