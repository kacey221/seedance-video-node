# Imported Image Copy/Paste And Cable Layering Design

## Goal

Keep connection cables behind all node media, and support keyboard copy/paste for imported canvas images only.

## Design

- Render the cable SVG above the grid background but below every node card.
- Treat an image as copyable only when `type === 'image'` and `isReference === true`, matching the existing upload, drag/drop, and clipboard-import path.
- Store the copied image in an in-memory React ref. Do not write application data into the operating-system clipboard.
- On paste, create a fresh image ID, offset the position by 32 canvas pixels per paste, and preserve the copied image's input relationships.
- Preserve output relationships by adding the pasted image ID to every child that references the source image.
- Ignore node shortcuts while focus is in an input, textarea, or contenteditable element.
- Keep existing external image-file paste behavior unchanged and give it priority when image files are present in the clipboard event.

## Testing

- Pure helper tests cover copy eligibility, fresh IDs, positional offsets, input relationships, and output relationship updates.
- Rendering tests verify cables use a lower layer than node cards.
- Run the full TypeScript check and test suite.
