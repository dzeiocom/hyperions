
export type MaybePromise<T = void> = T | Promise<T>
import type Hyperions from './Hyperions'

export interface HyperionAttributes {
	[key: `hyp:action${number}`]: string

	'hyp:trigger'?: string
	'hyp:multiple'?: boolean
	'hyp:path'?: string

	'hyp:action'?: string

	// deprecated ones
	'data-input'?: string
	'data-output'?: string
	'data-trigger'?: string
	'data-path'?: string
	'data-multiple'?: string

	//
	// TEMPLATE
	//

	'hyp:set'?: string
	'hyp:loop'?: string

	// deprecated
	'data-attribute'?: string
	'data-loop'?: string
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

export type Action = (ctx: ActionContext) => MaybePromise<object | void>
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
