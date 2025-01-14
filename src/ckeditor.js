/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import { ClassicEditor as ClassicEditorBase } from '@ckeditor/ckeditor5-editor-classic';

import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { CKFinderUploadAdapter as UploadAdapter } from '@ckeditor/ckeditor5-adapter-ckfinder';
import { Alignment } from '@ckeditor/ckeditor5-alignment';
import { Autoformat } from '@ckeditor/ckeditor5-autoformat';
import { Bold, Italic, Strikethrough, Subscript, Superscript, Underline } from '@ckeditor/ckeditor5-basic-styles';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { CKFinder } from '@ckeditor/ckeditor5-ckfinder';
import { EasyImage } from '@ckeditor/ckeditor5-easy-image';
import { Font, FontBackgroundColor, FontColor, FontFamily, FontSize } from '@ckeditor/ckeditor5-font';
import { GeneralHtmlSupport } from '@ckeditor/ckeditor5-html-support';
import { Heading } from '@ckeditor/ckeditor5-heading';
import { Highlight } from '@ckeditor/ckeditor5-highlight';
import { HorizontalLine } from '@ckeditor/ckeditor5-horizontal-line';
import { Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload } from '@ckeditor/ckeditor5-image';
import { Link, LinkImage } from '@ckeditor/ckeditor5-link';
import { List, ListProperties } from '@ckeditor/ckeditor5-list';
import { MultiLevelList } from '@ckeditor/ckeditor5-list-multi-level';
import { PageBreak } from '@ckeditor/ckeditor5-page-break';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { PasteFromOffice } from '@ckeditor/ckeditor5-paste-from-office';
import { RemoveFormat } from '@ckeditor/ckeditor5-remove-format';
import { SpecialCharacters, SpecialCharactersEssentials } from '@ckeditor/ckeditor5-special-characters';
import { Table, TableToolbar, TableProperties, TableCellProperties, TableColumnResize, TableCaption } from '@ckeditor/ckeditor5-table';
import { TextTransformation } from '@ckeditor/ckeditor5-typing';
import { CloudServices } from '@ckeditor/ckeditor5-cloud-services';
import { HtmlEmbed } from '@ckeditor/ckeditor5-html-embed';
import { MediaEmbed } from '@ckeditor/ckeditor5-media-embed';
import { Plugin } from '@ckeditor/ckeditor5-core';
import { Widget } from "@ckeditor/ckeditor5-widget";
import { Mention } from '@ckeditor/ckeditor5-mention';
import { Indent, IndentBlock } from '@ckeditor/ckeditor5-indent';
import { IndentParagraph } from '@lawmatics/ckeditor5-paragraph-indent';
import { ImportWord } from '@ckeditor/ckeditor5-import-word';
import MergeFieldCommand from "./commands/mergeFieldCommand";
import * as DOMPurify from 'dompurify';
import * as sanitizeHtml from 'sanitize-html';



import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';

export default class ClassicEditor extends ClassicEditorBase {}

class EmTagItalicPlugin extends Plugin {
	init() {
		this.editor.conversion.for('downcast').attributeToElement({
			model: 'italic',
			view: 'em',
			converterPriority: 'high',
		});
		this.editor.conversion.for('editingDowncast').attributeToElement({
			model: 'italic',
			view: 'em',
			converterPriority: 'high',
			upcastAlso: ['i', { styles: { 'font-style': 'italic' } }],
		});
	}
}

class MergeFieldPlugin extends Plugin {
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
			allowAttributes: ['name', 'id']
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for('upcast').elementToElement({
			view: { name: 'span', classes: ['mergeField']},
			model: (viewElement, { writer: modelWriter }) => {
				// Seems that older iOS versions (<= 13) don't handle the optional chaining operator (?.) very well.
				const element = viewElement.getChild(0);
				if (element) {
					const name = element.data;
					const id = element.getAttribute('id');
					if (name) return modelWriter.createElement('mergeField', {
						name,
						...(id ? { id } : {}),
					});
				}
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
		function createMergeFieldView(modelItem, viewWriter) {
			const name = modelItem.getAttribute('name');
			const id = modelItem.getAttribute('id');

			const mergeFieldView = viewWriter.createContainerElement('span', {
				class: 'mergeField',
				...(id ? { id } : {}),
			});

			const innerText = viewWriter.createText(name);
			viewWriter.insert(viewWriter.createPositionAt(mergeFieldView, 0), innerText);

			return mergeFieldView;
		}
	}
}

// Plugins to include in the build.
ClassicEditor.builtinPlugins = [
	Essentials,
	UploadAdapter,
	Alignment,
	Autoformat,
	Bold,
	Italic,
	BlockQuote,
	CKFinder,
	CloudServices,
	EasyImage,
	Font,
	FontBackgroundColor,
	FontColor,
	FontFamily,
	FontSize,
	GeneralHtmlSupport,
	Heading,
	Highlight,
	HorizontalLine,
	Image,
	ImageCaption,
	ImageResize,
	ImageStyle,
	ImageToolbar,
	ImageUpload,
	Indent,
	IndentBlock,
	IndentParagraph,
	Link,
	LinkImage,
	List,
	// MultiLevelList,
	ListProperties,
	PageBreak,
	Paragraph,
	PasteFromOffice,
	RemoveFormat,
	SpecialCharacters,
	SpecialCharactersEssentials,
	Subscript,
	Superscript,
	Strikethrough,
	Table,
	TableToolbar,
	TableProperties,
	TableCellProperties,
	TableColumnResize,
	TableCaption,
	Underline,
	HtmlEmbed,
	MediaEmbed,
	Mention,
	ImportWord,

	EmTagItalicPlugin,
	TextTransformation,
	MergeFieldPlugin,
];

// Editor configuration.
ClassicEditor.defaultConfig = {
	allowedContent: true,
	roundedCorners: true,
	toolbar: {
		shouldNotGroupWhenFull: true,
		items: [
			'heading',
			'|',
			'bold',
			'italic',
			'underline',
			'strikethrough',
			'|',
			'alignment',
			'|',
			'bulletedList',
			'numberedList',
			//'multiLevelList', uncomment when we have the license for this
			'|',
			'indent',
			'outdent',
			'|',
			'highlight',
			'fontBackgroundColor',
			'fontColor',
			'fontSize',
			'fontFamily',
			'|',
			'specialCharacters',
			'link',
			'uploadImage',
			'blockQuote',
			'insertTable',
			'htmlEmbed',
			'|',
			'undo',
			'redo',
			'removeFormat'
		]
	},
	alignment: {
		options: ['left', 'right', 'center', 'justify']
	},
	image: {
		toolbar: [
			// A dropdown containing `alignLeft` and `alignRight` options.
			'imageStyle:alignLeft',
			// A dropdown containing `alignBlockLeft`, `block` (default) and  `alignBlockRight` options.
			'imageStyle:breakText',
			'imageStyle:alignRight',
			'linkImage',
		],
		resizeUnit: 'px'
	},
	htmlEmbed: {
		showPreviews: true,
		sanitizeHtml: ( inputHtml ) => {
			// Strip unsafe elements and attributes, e.g.:
			// the `<script>` elements and `on*` attributes.
			// const outputHtml = sanitize( inputHtml );
			const purifiedHtml = DOMPurify.sanitize(inputHtml, { USE_PROFILES: { html: true } });
			const cleanHtml = sanitizeHtml(purifiedHtml);
			return {
				html: cleanHtml,
				// true or false depending on whether the sanitizer stripped anything.
				hasChanged: true
			};
		}
	},
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells',
			'tableProperties',
			'tableCellProperties',
		]
	},
	importWord: {
		formatting: {
			defaults: 'inline'
		}
	},
	list: {
		properties: {
			styles: true,
			startIndex: true,
			reversed: false,
		}
	},
	htmlSupport: {
		allow: [
			// Enables all HTML features.
			{
				name: /.*/,
				attributes: true,
				classes: true,
				styles: true
			}
		],
		disallow: [
			{
				attributes: [
					{ key: /^on(.*)/i, value: true },
					{ key: /.*/, value: /(\b)(on\S+)(\s*)=|javascript:|(<\s*)(\/*)script/i },
		  { key: /.*/, value: /data:(?!image\/(png|jpeg|gif|webp))/i }
				]
			},
			{ name: 'script' }
		]
	},
	fontFamily: {
		options: [
			'default',
			'Arial, Helvetica, sans-serif',
			'Baskerville, serif',
			'Bookman Old Style, Bookman, serif',
			'Cambria, serif',
			'Caslon, serif',
			'Century Schoolbook, serif',
			'Comic Sans MS, cursive, sans-serif',
			'Consolas, monaco, monospace',
			'Copperplate, Copperplate Gothic Light, fantasy',
			'Courier New, Courier, monospace',
			'Didot, serif',
			'Garamond, serif',
			'Geneva, Tahoma, sans-serif',
			'Georgia, serif',
			'Gill Sans, Gill Sans MT, sans-serif',
			'Helvetica Neue, Helvetica, Arial, sans-serif',
			'Hoefler Text, serif',
			'Impact, Charcoal, sans-serif',
			'Lucida Sans Unicode, Lucida Grande, sans-serif',
			'Palatino, Palatino Linotype, serif',
			'Rockwell, serif',
			'Sabon, serif',
			'Tahoma, Geneva, sans-serif',
			'Times New Roman, Times, serif',
			'Trebuchet MS, Helvetica, sans-serif',
			'Verdana, Geneva, sans-serif'
		],
		supportAllValues: true
	},
	fontSize: {
		options: [10, 12, 14, 'default', 18, 20, 22],
		supportAllValues: true
	},
	// This value must be kept in sync with the language defined in webpack.config.js.
	language: 'en'
};
