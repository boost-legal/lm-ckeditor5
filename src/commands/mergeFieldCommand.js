import Command from "@ckeditor/ckeditor5-core/src/command";

export default class MergeFieldCommand extends Command {
	execute( { value, id } ) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		editor.model.change( writer => {
			const attributes = {
				...Object.fromEntries(selection.getAttributes()),
				name: value
			};

			if (id) {
				attributes.id = id;
			}

			const mergeField = writer.createElement( 'mergeField', attributes );
			editor.model.insertContent( mergeField );
			writer.setSelection( mergeField, 'on' );
		} );
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;

		const isAllowed = model.schema.checkChild( selection.focus.parent, 'mergeField' );

		this.isEnabled = isAllowed;
	}
}
