# Image 2.5 Model Options Design

## Goal

Add three Image 2.5 choices to the image node model dropdown while preserving the model identifiers expected by the RightAPI image generation endpoint.

## User-Facing Behavior

The image node dropdown will include:

- `image-2.5`
- `image-2.5-flare`
- `image-2.5-sunburst`

The selected short name remains stored on the canvas node so the dropdown reflects the user's choice.

## Request Mapping

When a Right Codes image request is built, the three short aliases are translated as follows:

| Node model | API model |
| --- | --- |
| `image-2.5` | `gpt-image-2.5` |
| `image-2.5-flare` | `gpt-image-2.5-flare` |
| `image-2.5-sunburst` | `gpt-image-2.5-sunburst` |

All existing model identifiers pass through unchanged. Existing defaults remain `gpt-image-2`.

## Code Changes

- Extend the image node model type with the three short aliases.
- Add the three options to the existing image model dropdown.
- Centralize alias translation in the Right Codes request builder.

## Testing

- Verify the rendered image node dropdown contains all three short names.
- Verify each short name maps to its corresponding `gpt-image-*` API identifier.
- Run the focused tests, TypeScript checks, and production build.
