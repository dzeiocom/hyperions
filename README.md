# Hyperion

Hyperion is a library that allow you to make changes to the HTML content by using a mix of `<template />` and `JSON` Reponse from API endpoints

## Installation

```bash
npm i hyperion
```

## Usage

```js
import Hyperion from 'hyperion'
Hyperion.setup()
```

```html
<button
    data-trigger="" <-- How the input will be triggered

    data-input="/api/v1/" <-- get from a remote source (result MUST be in JSON)
    data-input="delete:/api/v1/" <-- the method is chosen by using a method
    data-input="run:action" <-- will run with param0 being the HTMLElement & param1 being the input data in JSON (form only)

    -- IO --

    data-path="path" <-- run the output on a child instead of the base object
    data-multiple <-- (ONLY if response object is an array) will display multiple elements instead of one

    data-output="template location|body|this{location} inner|outer|append" <-- Will fill the template, and display it in the location (inner,outer define if it replace or is a child)
    data-output="run:action" <-- will run with param0 being the HTMLElement & param1 being the data in JSON
    data-output="hyp:query" <-- Will run another Hyperion element by the query
></button>
```

- Template
it MUST only have one child
```html
<template id="pokemon">
    <p
        hyp:attr="key" <-- set the inner text of the element
        hyp:attr="html:key" <-- set the inner HTML of the element
        hyp:attr="outertext:key" <-- set the outer text of the element
        hyp:attr="outerhtml:key" <-- set the outer HTML of the element
        hyp:attr="any-other-attribute:key" <-- set the attribute of the element

        hyp:loop="key" <-- child elements will loop through each items of the array defined by `key`

        hyp
    ></p>
</template>
```

## References

### Attributes

one of the `data-input` or `data-output` MUST be set so that everything work.

#### data-trigger: (optionnal)
the different trigger available (default: 'submit' for <form> else 'click' for the rest) (multiple can be used)
- load: action is run on start
- once: only run Hyperion once (manual trigger can still happens if `force` is `true`)
- `after:xx`: trigger will defer until xx time of ms passed (allow to dedup requests)
- HTMLListenerEvent: any HTMLElement event available

#### data-input: (optionnal)
if data-input is not set it will directly got for data-output with an empty object
- url: will query the URL using a GET method for JSON data
- `method:url`: will query the URL using the method for JSON data
- `run:action`: Get informations by running an action

#### data-path: (optionnal)
a Subpath of the input data to lessen strain on the output

#### data-multiple: (optionnal)
if the input is an array and data-multiple is set, the output will be using array

#### data-output: (optionnal)
- template:     The template used to display
- location:     the location to display the element (default: this)
note: by using `this` as a prefix it will query relative to the current element (ex: `this#pouet`)
- replace|child: replace or append as child (default: child)


### Actions

Actions are elements defined in Hyperion that run code to fetch informations or run custom code

there is two types of actions:
- input Action
An input Action MUST return a JSON object and will have access to the HTMLElement that was triggered
`(element?: HTMLElement, input?: object) => Promise<object> | object`
the element can be omitted when trigger is done remotely
the input can be available depending on the source

- output Action
`(element: HTMLElement, output: object) => Promise<void> | void`
the output is the data fetched by the input

example output Action
`popup`
will search a popup template by using an additionnal attribute `data-template` and fill the elements to display a popup

builtin output actions
- `reload`: Reload the current page

### Hyperion Class

- Static
  - setup()
- Methods
  - on('trigger', ({ target: HTMLElement, trigger: string, force: boolean }) => void)
  - on('htmlChanged', ({ rootElement: HTMLElement }) => void)
  - on('error', ({ error: Error }) => void)
  - trigger('trigger', HTMLElement, options?: { force: boolean })
  - addInputAction(action)
  - addOutputAction(action)
  - fillTemplate(template: HTMLTemplateElement, data: object) => HTMLElement

## Examples

### pushing changes of a textarea to the remote server

```html
<textarea data-trigger="keyup after:200" data-input="post:/api/v1/text" name="text">
	base text
</textarea>
```

It will send this as a POST request to the url `/api/v1/text` with the body below
```json
{"text": "base text"}
```
