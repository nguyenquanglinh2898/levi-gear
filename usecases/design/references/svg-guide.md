# SVG guide

How `levi-designer` draws SVG designs, in the `design` usecase and in every usecase that has it draw. The prompt names what to draw, the references and the output folder. These rules add to the ones in your own definition.

## Rules

- **Valid and self-contained.** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H">`, with a `<title>` as the first child and a `<desc>` saying what the screen is. No `<image>`, no raster data, no external files, fonts, links or scripts, no `<foreignObject>`, no animation. Photos and illustrations are drawn as simple shapes or as a labeled placeholder rectangle.
- **One artboard per file.** One screen, state or breakpoint per file, drawn on an artboard with a background rect. Name files after what they show: `<screen>.svg`, `<screen>-<state>.svg`, `<screen>-<breakpoint>.svg`, in kebab-case.
- **Size.** Use the size of the reference when there is one (its aspect ratio is kept). Otherwise: mobile 390×844, tablet 768×1024, desktop 1440×900.
- **Tokens.** Define colors, type sizes, radii and shadows once per file in a `<style>` block as classes with literal values (`.text-primary{fill:#1F2937}`), and use the classes. Do not use CSS variables: many renderers ignore them. Reuse the same values in every file of the folder, and the project's tokens when it has them.
- **Structure.** Group by what things are, with kebab-case `id`s: `header`, `nav`, `card-order`, `button-primary`, `input-email`. Repeated parts (icons, buttons) are defined once in `<defs>` and drawn with `<use>`. Ids are unique in the file.
- **Text.** Real `<text>` elements, not outlines, so the content stays readable and searchable. Use a system font stack (`font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"`), never a font loaded from a URL. Text that wraps is split into `<tspan>` lines that fit their container.
- **Content.** Texts, labels, numbers and data come from the request or the references, exactly as given. Anything else is a placeholder, written like `[Product name]` or `Lorem ipsum`, never made-up facts, names or figures.
- **Accessibility.** Text contrast WCAG 2.1 AA (4.5:1, or 3:1 for large text), touch targets at least 44px, visible focus in focus states, meaning never by color alone. A recreate reference that breaks one of these is reproduced as it is and the problem is named in the report.
