import { isObject, objectClone, objectGet, objectValues } from '@dzeio/object-util'
import fill from './actions/fill'
import hyp from './actions/hyp'
import network from './actions/network'
import raw from './actions/raw'
import run from './actions/run'
import template from './actions/template'
import { ATTRIBUTES } from './consts'
import type { Action, ActionContext, ActionResult, Attribute, AttributeContext, Context, Events, ExecContext, InputAction, Modifiers, Options, OutputAction } from './types'
import { betterSplit, getChildElements } from './utils'
import { loop } from './attrs/loop'
import attrs from './attrs/attrs'
import ifElse from './attrs/if-else'

// export types for external usage
export type * as types from './types'
export * as utils from './utils'

/**
 * A central hub for processing and managing complex data sets
 */
export default class Hyperions {
	private static instance: Hyperions = new Hyperions()

	private events: Partial<Record<keyof Events, Array<Events[keyof Events]>>> = {}

	private loaded = false

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

	private attributes: Record<string, Attribute> = {
		'*': attrs,
		loop: loop,
		if: ifElse,
		else: ifElse
	}

	/**
	 * @deprecated old inputs/output values are deprecated
	 */
	private processes = {
		params: 'input',
		input: 'output',
		output: null
	} as const

	private constructor() {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (Hyperions.instance) {
			throw new Error('multiple instance of hyperion cannot live together !')
		}
		console.log('Setting up Hyperions')

		// @deprecated
		setTimeout(() => {
			if (!this.loaded) {
				console.warn('auto loading of the library is deprecated, run `.load()` after adding your actions')
				this.load()
			}
		}, 100)
	}


	/**
	 * setup the library for usage
	 */
	public static setup(): Hyperions {
		return Hyperions.instance
	}

	/**
	 * Load the library
	 */
	public load(): this {
		if (this.loaded) {
			return this
		}
		this.loaded = true
		this.init()
		return this
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

	public addAttribute(attribute: string, fn: Attribute) {
		this.attributes[attribute] = fn
		return this
	}

	/**
	 * Add a new type of action in Hyperions
	 *
	 * @param {string} prefix the prefix to use
	 * @param {Action | null} ev the function to run (if ev is null it will remove the action)
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

	public getContext(ctx: Omit<ActionContext, 'hyperions' | 'log'>): ActionContext {
		return {
			...ctx,
			hyperions: this,
			log: (...items: Array<unknown>) => {
				this.dlog(ctx.options, ...items)
			},
		}
	}

	/**
	* @deprecated use {@link runAction} with the
	*/
	public runOutputAction(action: string, ...params: Parameters<OutputAction>) {
		void this.runAction(this.getContext({
			origin: params[0],
			data: params[1],
			options: params[2],
			prefix: `run:${action}`
		}))
	}

	/**
	 * Run a specific action
	 *
	 * @param context the action context
	 * @returns get the result of the action
	 */
	public async runAction(context: ActionContext): Promise<ActionResult> {
		this.dlog(context.options, 'action: running action', context.prefix, context.value)
		const action = this.actions[context.prefix]
		if (!action) {
			console.error(`action: action ${context.prefix}:${context.value} not found !`)
			return {
				continue: false
			}
		}
		return await action(context) ?? {}
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
		const initialTrigger = actions.length > 0 ? actions[0] : 'input'

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
			throw new Error('fill: multiple childs, template MUST contains only one child')
		}

		return this.fill(node.firstElementChild as HTMLElement, data, { ...options, path: [] })
	}

	public async fillElement(element: HTMLElement, ctx: ExecContext, options?: Options) {
		const context: AttributeContext = {
			hyperions: this,
			element,
			process: (element, newContext, processSelf = true) => {
				if (processSelf) {
					this.fillElement(element, Object.assign({}, ctx, newContext))
				}
				this.fill(element, newContext?.data ?? ctx.data, { path: newContext?.path ?? ctx.path }, options)
			},
			options,
			log: (...params) => {
				this.dlog(options, ...params)
			},
			...ctx
		}

		for (const attr of Array.from(element.attributes)) {
			if (attr.name.startsWith('hyp:')) {
				const res1 = await this.attributes[attr.name.slice(4)]?.(context)
				const res2 = await this.attributes['*']?.(context)
				if (res1?.continue && res2?.continue) {
					for (const child of Array.from(element.children)) {
						this.fill(child as HTMLElement, ctx.data, { path: context.path }, options)
					}
				}
			}
		}
	}

	/**
	 * Fill an HTMLElement with data
	 *
	 * @param el the element to fill
	 * @param data the data to fill it with
	 * @returns the filled element (original changed)
	 */
	public fill(el: HTMLElement, data: object, context: Context = { path: [] }, options?: Options & { skipSelf?: boolean }) {
		this.dlog(context, 'fill: filling', el, data)


		// delete copies
		// el.querySelectorAll('[hyp\\:copy]').forEach((it) => it.remove())

		const list = getChildElements(el)

		for (const child of list) {
			this.dlog(context, 'fill: child detected', child)
			this.fillElement(child, { data, path: context.path }, context)
		}

		// setup the clone to work if it contains Hyperions markup
		this.init(el, options)

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
	public init(base: HTMLElement | DocumentFragment = document.body, options?: { skipSelf?: boolean }) {
		// handle templates
		if (base instanceof DocumentFragment) {
			for (const child of Array.from(base.children)) {
				this.init(child as HTMLElement, options)
			}
			return
		}

		// setup on itself when possible
		if (!options?.skipSelf && this.hasHyperionsAttributes(base)) {
			this.setupTrigger(base)
		}

		// run on childs
		for (const item of this.getHyperionsElements(base)) {
			this.setupTrigger(item)
		}
	}

	private getHyperionsElements(base: HTMLElement = document.body, ...attributes: Array<string>) {
		return Array.from(base.querySelectorAll<HTMLElement>('*')).filter((it) => {
			if (!this.hasHyperionsAttributes(it)) {
				return false
			}
			let match = attributes.length === 0
			for (const attr of attributes) {
				if (it.hasAttribute(attr)) {
					match = true
					break
				}
			}
			return match
		})
	}

	private hasHyperionsAttributes(item: HTMLElement): boolean {
		return Array.from(item.attributes).some((attr) => attr.name.startsWith('hyp:') || ATTRIBUTES.includes(attr.name.replace('data-', '') as 'params'))
	}

	private getElementActions(item: HTMLElement): Array<string> {
		const items = Array.from(item.attributes).filter((attr) => attr.name.startsWith('hyp:action')).map((it) => it.name).sort()
		if (items.length > 0) {
			return items
		}
		if (item.dataset.input || item.dataset.output) {
			return [
				'input',
				'output',
			]
		}
		return []
	}

	private setupTrigger(it: HTMLElement) {
		const execOptions = this.parseOptions(it)

		this.dlog(execOptions, 'Debug enabled for', it)
		this.dlog(execOptions, 'setup: setting up')

		const { triggers, modifiers } = this.parseTriggers(it)

		// skip if no triggers
		if (triggers[0] === 'none') {
			this.dlog(execOptions, 'setup: trigger set to "none", skipping...')
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
			this.dlog(options, 'setup: trigger set to "none", skipping...')
			return { triggers: ['none'], modifiers }
		}

		// add default trigger
		if (triggers.length === 0 && objectValues(modifiers).length === 0) {
			triggers.push(isForm ? 'submit' : 'click')
		}

		return { triggers, modifiers }
	}

	// eslint-disable-next-line complexity
	private async process(type: keyof typeof this.processes | `hyp:action${number}` | string, it: HTMLElement, baseData?: object, options: Options = this.parseOptions(it)): Promise<void> {
		// indicate deprection of `data-...` elements
		if (!type.startsWith('hyp:')) {
			console.warn(`Hyperions params using "data-${type}" is deprecated, use "hyp:action{number}" instead`)
		}

		this.dlog(options, 'process: processing', type)

		// get the action text
		const action = type.startsWith('hyp:') ? it.getAttribute(type) : it.dataset[type]

		// get the next action
		const actions = this.getElementActions(it)
		const next = type.startsWith('hyp:') ? actions[actions.indexOf(type) + 1] : this.processes[type as 'params']

		// parse params
		let data = baseData

		if (!data) {
			data = this.parseParams(it, options)
		}

		this.dlog(options, type, 'processing', it.tagName, 'with data', data)

		// @deprecated
		const subpath = it.dataset.path
		if (subpath) {
			console.warn('data-path is deprecated, use the template attributes instead')
			this.dlog(options, 'output: output has subpath', subpath, 'getting in params')
			data = objectGet(data, subpath)!
			this.dlog(options, 'output: new data from subpath', data)
		}

		if (!action) {
			this.dlog(options, `process: action "${type}" not found, skipping...`)

			if (next) {
				return this.process(next as any, it, data, options)
			}

			this.dlog(options, `process: no next action, finished !`)
			return
		}

		// load the params
		const defaultPrefix = action.includes('/') ? 'get' : 'template'
		const { prefix = defaultPrefix, value } = this.decodeParam(action)

		// run the specified action
		const res = await this.runAction(this.getContext({
			origin: it,
			value: value,
			data: data,
			type: type as 'hyp:action',
			options: options,
			prefix: prefix
		}))


		if ((res.continue ?? true) && next) {
			return this.process(next, it, options.keepParams ? { ...data, ...res.data } : res.data ?? {}, options)
		}
	}

	public fillAttribute(it: HTMLElement, attribute: string, data: object, context: Context) {
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
	 *
	 * @param {string} str the string to decode
	 * @returns {{prefix?: string, value: string}} the decoded string with it's value and prefix
	 */
	private decodeParam(str: string): { prefix?: string, value: string } {
		const index = str.indexOf(':')

		// param has not prefix, return the whole string as the value
		if (index === -1) {
			return { value: str }
		} else if (str[index - 1] === '\\') { // params skip the ':', return everything as a value
			return { value: str.slice(0, index - 1) + str.slice(index) }
		}

		// get the prefix
		const prefix = str.slice(0, index)

		// handle special case of http/https has a prefix, ignore it
		if (prefix === 'http' || prefix === 'https') {
			return { value: str }
		}

		// separate and return them
		return { prefix: prefix, value: str.slice(index + 1) }
	}

	/**
	 * Parse a Value string into the value from data
	 * @param {string} str the "Value String" that can be the path or a string that need to be filled like `hello {var}`
	 * @param {object} data the base data object
	 * @param {Contexta} context the path inside this object with
	 * @returns {unknown | undefined} the found value or undefined
	 */
	public parseValue(str: string, data: object, context: Context): unknown | undefined {
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
	public findValue(key: string, data: object, context: Array<string | number> = []): unknown {
		if (key.startsWith('this')) {
			const fromContext: unknown = objectGet(data, context) ?? data
			let sliced = key.slice(4)
			if (sliced.startsWith('.')) {
				sliced = sliced.slice(1)
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
	* Debug log
	* @param context the system context
	* @param items the items to print
	*/
	private dlog(context: Options = {}, ...items: Array<unknown>) {
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
		const isDebug = element.getAttribute('hyp:debug') || element.dataset.debug
		const options: Options = {
			debug: typeof isDebug === 'string' ? isDebug || (Math.random() * 100).toFixed(0) : undefined
		}

		// parse options
		const declaredOptions = element.getAttribute('hyp:options') || element.dataset.options
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

	/**
	 * Parse the parameters necessary to run Hyperions
	 * @param element the element to parse
	 * @param options the execution options
	 * @returns the parameters to run Hyperions
	 */
	private parseParams(element: HTMLElement, options: Options) {
		/**
		 * Setup Params
		 */
		const params: Record<string, unknown> = {}

		// get the element name if set
		const name = (element as HTMLInputElement).name || element.dataset.name

		// parse form values into input params
		if (element.tagName === 'FORM') {
			this.dlog(options, 'parseParams: element is a Form, getting inputs as params')
			const formData = new FormData(element as HTMLFormElement)

			// loop throught each inputs
			formData.forEach((value, key) => {
				const multi = element.querySelector<HTMLInputElement>(`input[type][name="${key}"]`)?.type === 'checkbox'
				if (multi) {
					params[key] = formData.getAll(key)
				} else {
					params[key] = value
				}
			})
		} else if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && name) { // parse input value into input param
			this.dlog(options, 'input: element is an Input, getting name and value as param')
			if ((element as HTMLInputElement | HTMLTextAreaElement).type === 'file') {
				params[name] = (element as HTMLInputElement).files
			} else {
				params[name] = (element as HTMLInputElement | HTMLTextAreaElement).value
			}
		}

		// @deprecated old usage remaining for compatibility
		if (element.dataset.params) {
			this.dlog(options, 'input: element as data-params, parsing them into params')
			const exchange = betterSplit(element.dataset.params)
			for (const item of exchange) {
				const { prefix, value } = this.decodeParam(item)
				if (!prefix) {
					continue
				}
				params[prefix] = value
			}
		}

		return params
	}
}
