
export type MaybePromise<T = void> = T | Promise<T>
import type Hyperions from './Hyperions'

export type HyperionAttributes = HyperionTemplateItemAttributes | HyperionItemAttributes

export interface HyperionTemplateItemAttributes {
	'hyp:set'?: string
	'hyp:loop'?: string

	// deprecated
	'data-attribute'?: string
	'data-loop'?: string
}

export interface HyperionItemAttributes {
	[key: `hyp:action${number}`]: string

	/**
	 * Change how Hyperions run on the element
	 */
	'hyp:options'?: string

	/**
	 * Indicate when Hyperions will run
	 */
	'hyp:trigger'?: string
	'hyp:multiple'?: boolean

	'hyp:action'?: string

	/**
	 * @deprecated use `hyp:action`
	 */
	'data-input'?: string

	/**
	 * @deprecated use `hyp:action1`
	 */
	'data-output'?: string

	/**
	 * @deprecated use `hyp:trigger`
	 */
	'data-trigger'?: string
	/**
	 * @deprecated use the template attributes
	 */
	'data-path'?: string

	/**
	 * @deprecated use `hyp:multiple`
	 */
	'data-multiple'?: string

	/**
	 * @deprecated use `hyp:options`
	 */
	'data-options'?: string
}

export interface ActionContext {
	hyperions: Hyperions
	origin?: HTMLElement | undefined
	value?: string | undefined
	data?: object | undefined
	type?: 'input' | 'output' | 'params' | `hyp:action${number}` | 'hyp:action' | undefined
	options?: Options | undefined
	prefix: string
	log(...items: Array<any>): void
}

export interface Modifiers {
	once?: boolean
	load?: boolean
	after?: number
	isForm?: boolean
}

export interface ActionResult {
	/**
	 * The data to pass to the next action
	 */
	data?: object
	/**
	 * if continue is not set or is set to true the next action will be run
	 */
	continue?: boolean
}

export type Action = (ctx: ActionContext) => MaybePromise<ActionResult | void>
export type InputAction = (element?: HTMLElement, input?: object, options?: Options) => MaybePromise<object>
export type OutputAction = (element?: HTMLElement, output?: object, options?: Options) => MaybePromise

export interface Options {
	debug?: string | undefined

	/**
	 * keep the data-attribute elements
	 */
	keepDataAttributes?: boolean | undefined

	/**
	 * keep params set in input through output (default: false)
	 */
	keepParams?: boolean | undefined
}

export interface Events {
	trigger: (ev: {
		/**
		 * the source element
		 */
		target: HTMLElement

		/**
		 * the trigger that triggered
		 */
		trigger: string
	}) => MaybePromise
	htmlChange: (ev: { newElement: HTMLElement }) => MaybePromise
	error: (ev: { error: Error, params?: object | undefined }) => MaybePromise
}

export interface Context extends Options {
	path: Array<string | number>
	index?: number
}
