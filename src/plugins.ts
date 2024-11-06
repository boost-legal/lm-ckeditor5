import { Widget, toWidget, viewToModelPositionOutsideModelElement } from "@ckeditor/ckeditor5-widget";
import { Command, Plugin, Editor } from "@ckeditor/ckeditor5-core";
import ModelElement from "@ckeditor/ckeditor5-engine/src/model/element.js";
import Node from "@ckeditor/ckeditor5-engine/src/model/node.js";
import DowncastWriter from "@ckeditor/ckeditor5-engine/src/view/downcastwriter.js";

export class EmTagItalicPlugin extends Plugin {
	init() {
		this.editor.conversion.for('downcast').attributeToElement({
			model: 'italic',
			view: 'em',
			converterPriority: 'high',
		});
		this.editor.conversion.for<'editingDowncast'>('editingDowncast').attributeToElement({
			model: 'italic',
			view: 'em',
			converterPriority: 'high',
			// @ts-ignore
			upcastAlso: ['i', { styles: { 'font-style': 'italic' } }],
		});
	}
}

export class MergeFieldPlugin extends Plugin {
	static get requires() {
		return [Widget];
	}

	init() {
		this._defineSchema();
		this._defineConverters();
		this.editor.commands.add('mergeField', new MergeFieldCommand(this.editor));
		this.editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement(this.editor.model, viewElement => viewElement.hasClass('mergeField'))
		);
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register('mergeField', {
			allowWhere: '$text',
			isInline: true,
			isObject: true,
			allowAttributesOf: '$text',
			allowAttributes: ['name']
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for('upcast').elementToElement({
			view: { name: 'span', classes: ['mergeField'] },
			model: (viewElement, { writer: modelWriter }) => {
				// Seems that older iOS versions (<= 13) don't handle the optional chaining operator (?.) very well.
				const element = viewElement.getChild(0);
				if (element) {
					// @ts-ignore
					const name = element.data;
					if (name) return modelWriter.createElement('mergeField', { name });
					return null;
				}
				return null;
			}
		});

		conversion.for('editingDowncast').elementToElement({
			model: 'mergeField',
			view: (modelItem, { writer: viewWriter }) => {
				const widgetElement = createMergeFieldView(modelItem, viewWriter);
				return toWidget(widgetElement, viewWriter);
			}
		});

		conversion.for('dataDowncast').elementToElement({
			model: 'mergeField',
			view: (modelItem, { writer: viewWriter }) => createMergeFieldView(modelItem, viewWriter)
		});

		// Helper method for both downcast converters.
		function createMergeFieldView(modelItem: ModelElement, viewWriter: DowncastWriter) {
			const name = modelItem.getAttribute('name') as string;

			const mergeFieldView = viewWriter.createContainerElement('span', {
				class: 'mergeField'
			});

			const innerText = viewWriter.createText(name);
			viewWriter.insert(viewWriter.createPositionAt(mergeFieldView, 0), innerText);

			return mergeFieldView;
		}
	}
}

class MergeFieldCommand extends Command {
	override execute( { value }: { value: string } ) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		editor.model.change( writer => {
			const mergeField = writer.createElement( 'mergeField', {
				...Object.fromEntries(selection.getAttributes()),
				name: value
			} );
			editor.model.insertContent( mergeField );
			writer.setSelection( mergeField, 'on' );
		} );
	}

	override refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;

		const isAllowed = model.schema.checkChild( selection.focus?.parent as Node, 'mergeField' );

		this.isEnabled = isAllowed;
	}
}

export class IndentParagraph extends Plugin {
	static get defaultIndentSize() {
		return 36;
	}

	init() {
		const editor = this.editor;
		const keystrokes = [
			{ key: 'Tab', action: 'increase' },
			{ key: 'Shift+Tab', action: 'decrease' },
			{ key: 'Backspace', action: 'decrease' }
		];

		keystrokes.forEach(({ key, action }) => {
			editor.keystrokes.set(key, (_, cancel) => {
				const indentChanged = this.adjustParagraphIndent(editor, action);
				if (key !== 'Backspace' || indentChanged) {
					cancel(); // Always cancel for Tab and Shift+Tab, or if Backspace changed the indent
				}
			}, { priority: 'high' });
		});

		editor.conversion.for('downcast').attributeToAttribute({
			model: 'textIndent',
			view: (_, _2, { attributeNewValue }) => ({ key: 'style', value: { 'text-indent': `${attributeNewValue}px` } })
		});
	}

	adjustParagraphIndent(editor: Editor, action: string) {
		const selection = editor.model.document.selection;
		const position = selection.getFirstPosition();
		const paragraph = position && position.findAncestor('paragraph');
		if (position && position.isAtStart && paragraph) {
			const viewElement = editor.editing.mapper.toViewElement(paragraph);
			let currentIndentStr = (viewElement && viewElement.getStyle('text-indent')) || (paragraph.getAttribute('textIndent') as string | undefined) || '0';
			const currentIndent = parseInt(currentIndentStr, 10);
			const change = action === 'increase' ? IndentParagraph.defaultIndentSize : -IndentParagraph.defaultIndentSize;
			const newIndentValue = Math.max(currentIndent + change, 0);

			if (newIndentValue !== currentIndent) {
				editor.model.change(writer => {
					writer.setAttribute('textIndent', newIndentValue, paragraph);
				});
				return true; // Indent was adjusted
			}
		}
		return false; // No indent adjustment was made
	}
}
