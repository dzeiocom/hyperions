import { isObject, objectClone, objectGet } from '@dzeio/object-util'
import fill from './actions/fill'
import hyp from './actions/hyp'
import network from './actions/network'
import raw from './actions/raw'
import run from './actions/run'
import template from './actions/template'
import { ATTRIBUTES } from './consts'
import type { Action, ActionContext, Context, Events, InputAction, Modifiers, Options, OutputAction } from './types'
import { betterSplit } from './utils'

export type * as types from './types'
export * as utils from './utils'


/**
 * A central hub for processing and managing complex data sets
 */
export default class Hyperions {
	private static instance: Hyperions = new Hyperions()

	private events: Partial<Record<keyof Events, Array<Events[keyof Events]>>> = {}

	private actions: Record<string, Action> = {
		run: run,
		hyp: hyp,
		raw: raw,
		get: network,
		post: network,
		put: network,
		delete: network,
		patch: network,

		fill: fill,
		template: template
	}

	private constructor() {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (Hyperions.instance) {
			throw new Error('multiple instance of hyperion cannot live together !')
		}
		console.log('Setting up Hyperions')
		this.init()
	}

	/**
	 * setup the library for usage
	 */
	public static setup(): Hyperions {
		return Hyperions.instance
	}

	/**
	 * @deprecated use {@link addAction} with the prefix being `run:{action}`
	 */
	public addOutputAction(action: string, ev: OutputAction | null) {
		return this.addAction(`run:${action}`, ev ? (ctx) => ev(ctx.origin, ctx.data, ctx.options) : ev)
	}

	/**
	 * @deprecated use {@link addAction} with the prefix being `run:{action}`
	 */
	public addInputAction(action: string, ev: InputAction | null) {
		return this.addAction(`run:${action}`, ev ? (ctx) => ev(ctx.origin, ctx.data, ctx.options) : ev)
	}

	/**
	 * Add a new type of action in Hyperions
	 *
	 * @param prefix the prefix to use
	 * @param ev the function to run
	 * @returns this
	 */
	public addAction(prefix: string, ev: Action | null) {
		if (ev === null) {
			delete this.actions[prefix]
			return this
		}

		this.actions[prefix] = ev
		return this
	}

	/**
	* @deprecated use {@link runAction}
	*/
	public runOutputAction(action: string, ...params: Parameters<OutputAction>) {
		const ctx: ActionContext = {
			hyperions: this,
			log: () => void {},
			origin: params[0],
			data: params[1],
			options: params[2],
			prefix: `run:${action}`
		}

		void this.runAction(ctx)
	}

	/**
	 * Run a specific action
	 *
	 * @param context the action context
	 * @returns get the result of the action
	 */
	public async runAction(context: ActionContext): Promise<object | undefined> {
		this.dlog(context.options, 'action: running action', context.prefix, context.value)
		const action = this.actions[context.prefix]
		if (!action) {
			return undefined
		}
		return await action(context) as object | undefined
	}

	/**
	 * add an event to Hyperions
	 *
	 * @param event the event to register on
	 * @param ev the event that will run
	 */
	public on<T extends keyof Events>(event: T, ev: Events[T]): this {
		if (!this.events[event]) {
			this.events[event] = []
		}
		this.events[event].push(ev)
		return this
	}

	/**
	 * manually trigger an element
	 *
	 * @param element the element to trigger
	 */
	public trigger = (input: HTMLElement | Event): this => {
		let element: HTMLElement | undefined
		let ev: Event | undefined
		if (input instanceof Event) {
			ev = input
			element = input.currentTarget as HTMLElement
		} else {
			element = input
		}

		const actions = this.getElementActions(element)
		const initialTrigger = actions.length > 0 ? actions[0] : 'params'

		const options = this.parseOptions(element)
		const { modifiers, triggers } = this.parseTriggers(element)

		this.dlog(options, 'trigger: Event triggered')
		if (ev && (ev.currentTarget as HTMLElement).tagName === 'FORM') {
			this.dlog(options, 'trigger: form detected, cancelling builtin submit')
			ev.preventDefault()
		}

		// handle event only happening once
		if (modifiers.once) {
			this.dlog(options, 'trigger: running only once, removing listeners')
			for (const trigger of triggers) {
				element.removeEventListener(trigger, this.trigger)
			}
		}

		// special case for option `after:xxx`
		if (modifiers.after) {
			this.dlog(options, 'trigger: getting dedupped')
			const timeout = element.dataset.timeout ? parseInt(element.dataset.timeout, 10) : undefined
			if (timeout) { // remove existing timer
				this.dlog(options, 'trigger: existing event detected, cancelling old')
				clearTimeout(timeout)
				element.removeAttribute('data-timeout')
			}

			// set a new timer
			element.dataset.timeout = setTimeout(() => {
				// process
				this.dlog(options, 'trigger: dedupping done, running')
				void this.process(initialTrigger, element)
				element.removeAttribute('data-timeout')
			}, modifiers.after) as unknown as string

			// skip execution
			return this
		}

		// run it
		this.dlog(options, 'trigger: running')
		void this.process(initialTrigger, element)
		return this
	}

	/**
	 * create a new HTMLElement from a template and fill it with data
	 *
	 * @param template the template to fill
	 * @param data the data to filel with
	 * @returns the filled HTMLElement
	 */
	public fillTemplate(template: HTMLTemplateElement, data: object, options?: Options): HTMLElement {
		this.dlog(options, 'fill: cloning template')
		// clone the template
		const node = template.content.cloneNode(true) as DocumentFragment | HTMLElement

		if (node.childElementCount > 1) {
			throw this.makeError(template, 'fill: multiple childs, template MUST contains only one child')
		}

		return this.fill(node.firstElementChild as HTMLElement, data, { ...options, path: [] })
	}

	/**
	 * Fill an HTMLElement with data
	 *
	 * @param el the element to fill
	 * @param data the data to fill it with
	 * @returns the filled element (original changed)
	 */
	public fill(el: HTMLElement, data: object, context: Context = { path: [] }) {
		this.dlog(context, 'fill: filling', el, data)
		if (el.dataset.loop) {
			this.dlog(context, 'fill: root loop detected', el)
			this.fillLoop(el, data, context)
		}

		let childLoop = el.querySelector<HTMLElement>('[data-loop]')
		while (childLoop) {
			this.dlog(context, 'fill: child loop detected', childLoop)
			this.fillLoop(childLoop, data, context)
			childLoop = el.querySelector<HTMLElement>('[data-loop]')
		}

		// go through every elements that has a attribute to fill
		this.processIfElse(el, data)
		this.fillAttributes(el, data, context)
		// biome-ignore lint/complexity/noForEach: <explanation>
		el.querySelectorAll<HTMLElement>('[data-attribute],[data-input],[data-output],[data-params]').forEach((it) => { this.fillAttributes(it, data, context) })

		// setup the clone to work if it contains Hyperions markup
		this.init(el)

		return el
	}

	public emit<T extends keyof Events>(ev: T, params: Parameters<Events[T]>[0]) {
		const listeners = (this.events[ev] ?? []) as Array<Events[T]>
		for (const listener of listeners) {
			void listener(params as any)
		}
	}

	/**
	 * initialise hyperion
	 * @param base the base to query from
	 */
	private init(base: HTMLElement = document.body) {
		// setup on itself when possible
		if (this.hasHyperionsAttributes(base)) {
			this.setupTrigger(base)
		}

		for (const item of this.getHyperionsElements(base)) {
			this.setupTrigger(item)
		}
	}

	private getHyperionsElements(base: HTMLElement = document.body) {
		return Array.from(base.querySelectorAll<HTMLElement>('*')).filter(this.hasHyperionsAttributes)
	}

	private hasHyperionsAttributes(item: HTMLElement): boolean {
		return Array.from(item.attributes).some((attr) => attr.name.startsWith('hyp:'))
	}

	private getElementActions(item: HTMLElement): Array<string> {
		return Array.from(item.attributes).filter((attr) => !attr.name.startsWith('hyp:action')).map((it) => it.name).sort()
	}

	private setupTrigger(it: HTMLElement) {
		const execOptions = this.parseOptions(it)

		this.dlog(execOptions, 'Debug enabled for', it)
		this.dlog(execOptions, 'setup: setting up')

		const { triggers, modifiers } = this.parseTriggers(it)

		// skip if no triggers
		if (triggers[0] === 'none') {
			console.log(execOptions.debug, 'setup: trigger set to "none", skipping...')
			return
		}

		let items: Array<HTMLElement> = [it]

		if (modifiers.isForm) {
			items = Array.from(it.querySelectorAll<HTMLElement>('input[name],textarea[name]'))
		}

		// add event listeners
		for (const trigger of triggers) {
			this.dlog(execOptions, 'setup: running on', trigger)
			for (const item of items) {
				item.addEventListener(trigger, this.trigger)
			}
		}

		// on load run instantly
		if (modifiers.load) {
			this.dlog(execOptions, 'trigger: triggered on load')
			this.trigger(it)
		}
	}

	/**
	 * Parse the triggers of the element
	 * @param element the element
	 * @returns the triggers and modifiers of the element
	*/
	private parseTriggers(element: HTMLElement): { triggers: Array<string>, modifiers: Partial<Modifiers> } {
		const options = this.parseOptions(element)

		const trigger = element.getAttribute('hyp:trigger') ?? element.dataset.trigger

		const triggers: Array<string> = []

		const isForm = element.tagName === 'FORM'

		// the triggering options
		const modifiers: Modifiers = {}

		// parse options
		const splitted = betterSplit(trigger)
		for (const item of splitted) {
			const { prefix, value } = this.decodeParam(item)
			const modifier = prefix ?? value
			switch (modifier) {
				case 'load':
				case 'once':
					this.dlog(options, `setup: modifier ${modifier}`)
					modifiers[modifier] = true
					break
				case 'after': {
					const parsed = Number.parseInt(value, 10)
					this.dlog(options, 'setup: using dedup with value', parsed)
					modifiers.after = parsed
					break
				}
				case 'form': {
					modifiers.isForm = true
					triggers.push(value)
					break
				}
				default:
					triggers.push(item)
					break
			}
		}

		if (trigger === 'none') {
			console.log(options.debug, 'setup: trigger set to "none", skipping...')
			return { triggers: ['none'], modifiers }
		}

		// add default trigger
		if (triggers.length === 0) {
			triggers.push(isForm ? 'submit' : 'click')
		}

		return { triggers, modifiers }
	}

	private processes = {
		params: 'input',
		input: 'output',
		output: null
	} as const

	private async process(type: keyof typeof this.processes | `hyp:action${number}` | string, it: HTMLElement, baseData?: object, options: Options = {}): Promise<void> {
		const action = type.startsWith('hyp:') ? it.getAttribute(type) : it.dataset[type]
		const actions = this.getElementActions(it)
		const next = type.startsWith('hyp:') ? actions[actions.indexOf(type) + 1] : this.processes[type as 'params']

		let data = baseData
		this.dlog(options, type, 'processing', it.tagName, 'with data', data)

		if (!data) {
			data = this.parseParams(it, options)
		}

		const subpath = it.getAttribute('hyp:path') ?? it.dataset.path
		if (subpath) {
			this.dlog(options, 'output: output has subpath', subpath, 'getting in params')
			data = objectGet(data, subpath)!
			this.dlog(options, 'output: new data from subpath', data)
		}

		if (!action) {
			this.dlog(options, `${type}: hyp:${type} not found, skipping...`)

			if (next) {
				return this.process(next as any, it, data, options)
			}
			return
		}

		const defaultPrefix = action.includes('/') ? 'get' : 'template'
		const { prefix = defaultPrefix, value } = this.decodeParam(action)

		const res = await this.runAction({
			hyperions: this,
			log: () => void {},
			origin: it,
			value: value,
			data: data,
			type: type as 'hyp:action',
			options: options,
			prefix: prefix
		})


		if (next) {
			return this.process(next, it, options.keepParams ? { ...data, ...res } : res ?? {}, options)
		}
	}

	private processIfElse(it: HTMLElement, data: object, context: Context = { path: [] }) {
		const items = Array.from(it.querySelectorAll<HTMLElement>('[data-if],[data-else]'))
		for (const item of items) {
			const dataIf = item.dataset.if
			const dataElse = item.dataset.else

			if (dataIf) {
				const value = this.findValue(dataIf, data, context.path)
				if (!value) {
					item.remove()
				} else {
					item.removeAttribute('data-if')
				}
			}
			if (dataElse) {
				const value = this.findValue(dataElse, data, context.path)
				if (value) {
					item.remove()
				} else {
					item.removeAttribute('data-else')
				}
			}
		}
	}

	private fillLoop(it: HTMLElement, data: object, context: Context) {
		const path = it.dataset.loop
		if (!path) {
			this.dlog(context, 'fillLoop: loop has no `data-loop')
			return
		}
		this.dlog(context, 'fill: loop detected', path)

		// get the sub element
		let subElement: Array<unknown>
		if (path === 'this') {
			this.dlog(context, 'fillLoop: loop is `this`, looping on the current data', data)
			subElement = data as Array<unknown>
		} else {
			subElement = objectGet(data, path)!
		}

		for (let idx = 0; idx < subElement.length; idx++) {

			const currentContext = objectClone(context)

			// update context with new value
			if (path === 'this') {
				currentContext.path = [...currentContext.path, idx]
			} else {
				currentContext.path = [...currentContext.path, path, idx]
			}

			this.dlog(context, 'fillLoop: loop context', context)

			const child = it.cloneNode(true) as HTMLElement
			child.removeAttribute('data-loop')

			let childLoop = child.querySelector<HTMLElement>('[data-loop]')
			while (childLoop) {
				this.fillLoop(childLoop, data, currentContext)
				childLoop = child.querySelector<HTMLElement>('[data-loop]')
			}

			this.fillLoop(child, data, currentContext)
			const newData = { ...data, loop: { index: idx } }

			// go through every elements that has a attribute to fill
			this.processIfElse(child, newData, currentContext)
			this.fillAttributes(child, newData, currentContext)
			// biome-ignore lint/complexity/noForEach: <explanation>
			const items = Array.from(child.querySelectorAll<HTMLElement>('[data-attribute],[data-input],[data-output]'))
			for (const item of items) {
				this.fillAttributes(item, newData, currentContext)
			}
			// child.querySelectorAll<HTMLElement>('[data-attribute],[data-input],[data-output]').forEach((it) => this.fillAttrs(it, sub))

			it.after(child)
		}

		it.remove()
	}

	/**
	 * fill the attributes to the element
	 * @param {HTMLElement} it the element to fill
	 * @param {object} data the data link to this element
	 * @param {Context} context the context needed to resolve inside data
	 * @returns the filled element
	 */
	private fillAttributes(it: HTMLElement, data: object, context: Context) {
		// get the raw attribute
		const attrRaw = it.dataset.attribute

		// handle data-input, data-output, ...
		for (const attr of ATTRIBUTES) {
			const value = it.dataset[attr]
			this.fillAttribute(it, `data-${attr}:${value}`, data, context)
		}

		// skip if not contains a data-attribute
		if (typeof attrRaw !== 'string') {
			return
		}

		// parse into an array
		const attrs: Array<string> = betterSplit(attrRaw)

		// loop through each attributes
		for (const attr of attrs) {
			this.fillAttribute(it, attr, data, context)
		}

		// idk if necessary but remove the attributes from the final HTML
		if (!context.keepDataAttributes) {
			it.removeAttribute('data-attribute')
		}
	}

	private fillAttribute(it: HTMLElement, attribute: string, data: object, context: Context) {
		// decode attribute
		const { prefix = 'text', value } = this.decodeParam(attribute)

		// parse the attribute value and fill templates
		const attr = this.parseValue(value, data, context) as string

		// skip editing and empty attribute value
		if (typeof attr === 'undefined') {
			return
		}

		// set the value
		switch (prefix) {
			case 'html': {
				it.innerHTML = attr
				break
			}
			case 'text': {
				it.innerText = attr
				break
			}
			default: {
				if (prefix in it) {
					it[prefix as 'innerHTML'] = attr
				} else {
					it.setAttribute(prefix, attr)
				}
			}
		}
	}


	/**
	 * decode an Hyperions parameter agenced like this `prefix:value`
	 * @param str the string to decode
	 * @returns the decoded string with it's value and prefix
	 */
	private decodeParam(str: string): { prefix?: string, value: string } {
		const index = str.indexOf(':')

		if (index === -1) {
			return { value: str }
		} else if (str[index - 1] === '\\') {
			return { value: str.slice(0, index - 1) + str.slice(index) }
		}

		const prefix = str.slice(0, index)

		// handle special case of http/https
		if (prefix === 'http' || prefix === 'https') {
			return { value: str }
		}

		return { prefix: prefix, value: str.slice(index + 1) }
	}

	/**
	 * Parse a Value string into the value from data
	 * @param {string} str the "Value String" that can be the path or a string that need to be filled like `hello {var}`
	 * @param {object} data the base data object
	 * @param {Contexta} context the path inside this object with
	 * @returns {unknown | undefined} the found value or undefined
	 */
	private parseValue(str: string, data: object, context: Context): unknown | undefined {
		let value = str

		if (typeof value === 'undefined' || value === null) {
			return value
		}

		if (!value.includes('{')) {
			return this.findValue(value, data, context.path)
		}

		let res = /\{(.*?)\}/g.exec(value)
		while (res && res.length >= 2) {
			const key = res[1]
			const tmp = this.findValue(key, data, context.path)
			if (typeof tmp !== 'undefined') {
				value = value.replace(res[0], tmp as string)
			} else {
				value = value.replace(res[0], '')
			}

			res = /\{(.*?)\}/g.exec(value)
		}

		return value
	}

	/**
	* find a value in an object depending on a context and key
	*
	* @param key the key
	* @param data the data object
	* @param context the location of the data
	* @returns the found value or undefined if not found
	*/
	private findValue(key: string, data: object, context: Array<string | number> = []): unknown {
		if (key.startsWith('this')) {
			const fromContext: unknown = objectGet(data, context) ?? data
			let sliced = key.slice(4)
			if (sliced.startsWith('.')) {
				sliced = sliced.slice(1)
				console.log(fromContext, sliced, context)
				const tmp: unknown = objectGet(fromContext, sliced)
				return tmp
			}
			return fromContext
		}
		if (!isObject(data) && (Array.isArray(key) && key.length > 0 || key)) {
			return undefined
		}
		return objectGet(data, key)
	}

	/**
	 * create an Hyperions Error message
	 *
	 * @param {HTMLElement} el the {@link HTMLElement} linked to the issue (normally the one containing data-something)
	 * @param {string} message the message to send
	 * @param {object|undefined} params the parameters to send with
	 * @returns {Error} the Final {@link Error} object
	 */
	private makeError(el?: HTMLElement, message?: string, params?: object): Error {
		el?.dispatchEvent(new CustomEvent('hyperion:error', {
			detail: {
				error: message,
				params: params
			}
		}))
		const error = new Error(message)
		this.emit('error', { error, params })
		console.error(message, '\nparams:', params, '\nel:', el)
		return error
	}

	/**
	* Debug log
	* @param context the system context
	* @param items the items to print
	*/
	private dlog(context: Options = {}, ...items: Array<any>) {
		if (context.debug) {
			console.log(context.debug, ...items)
		}
	}

	/**
	 * parse execution options for an element
	 *
	 * @param element the element to parse options from
	 * @returns the options it detected
	*/
	private parseOptions(element: HTMLElement): Options {
		// prepare options
		const options: Options = {
			debug: typeof element.dataset.debug === 'string' ? element.dataset.debug || (Math.random() * 100).toFixed(0) : undefined
		}

		// parse options
		const declaredOptions = element.dataset.options
		if (declaredOptions) {
			const opts = betterSplit(declaredOptions)
			for (const item of opts) {
				const { prefix, value } = this.decodeParam(item)
				if (!prefix) {
					continue
				}

				if (value === 'true' || value === 'false') {
					options[prefix as 'keepParams'] = value === 'true'
				} else {
					options[prefix as 'debug'] = value
				}
			}
		}

		return options
	}

	private parseParams(element: HTMLElement, options: Options) {
		const name = (element as HTMLInputElement).name || element.dataset.name
		/**
		 * Setup Params
		 */
		const params: object = {}

		// parse form values into input params
		if (element.tagName === 'FORM') {
			this.dlog(options, 'input: element is a Form, getting inputs as params')
			const formData = new FormData(element as HTMLFormElement)
			console.log(formData)
			formData.forEach((value, key) => {
				const multi = element.querySelector<HTMLInputElement>(`input[type][name="${key}"]`)?.type === 'checkbox'
				if (multi) {
					(params as any)[key] = formData.getAll(key)
				} else {
					(params as any)[key] = value
				}
			})
			// parse input value into input param
		} else if (element.tagName === 'INPUT' && name) {
			this.dlog(options, 'input: element is an Input, getting name and value as param')
			if ((element as HTMLInputElement).type === 'file') {
				(params as any)[name] = (element as HTMLInputElement).files
			} else {
				(params as any)[name] = (element as HTMLInputElement).value
			}
		}

		if (element.dataset.params) {
			this.dlog(options, 'input: element as data-params, parsing them into params')
			const exchange = betterSplit(element.dataset.params)
			for (const item of exchange) {
				const { prefix, value } = this.decodeParam(item)
				if (!prefix) {
					continue
				}
				(params as any)[prefix] = value
			}
		}

		return params
	}
}
