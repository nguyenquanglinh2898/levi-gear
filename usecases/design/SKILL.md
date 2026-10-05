---
name: levi-design
description: Create UI/UX designs as SVG files with the Designer, from a plain text description, from images or videos the user uploads (screenshots, mockups, sketches, screen recordings), or from both. Videos are turned into key frames first. The SVG files go to docs/designs/<slug>/. Uses the project's spec in docs/specs/ as context when one exists; never creates or edits specs. Fits requests such as "design a login screen", "draw this screen as SVG", "recreate this mockup", "design the app shown in this video", "thiết kế màn hình X", "vẽ lại giao diện trong ảnh này".
argument-hint: "<what to design, and the images or videos to base it on>"
---

# Design

Turn a description, images or videos into SVG designs. `levi-designer` is the only agent that draws; you prepare what it needs to see, run it, check the files it wrote, and relay its questions to the user. Never draw, edit or fix an SVG yourself.

A design is built from what the user gave: the text, the images, the frames of the videos, the spec. Do not invent product content, data or features. When the designer needs a text or a value nobody provided, it uses a clearly marked placeholder.

## Inputs

| Input | How it is used |
|---|---|
| Text | What to design, for whom, the style, the screens, the sizes. The words of the user decide whether an image is something to **recreate** or only a **style reference**. When it is unclear, recreate |
| Image (screenshot, mockup, photo of a sketch, PDF) | The designer reads it directly from a file path |
| Video or GIF | Cannot be read by the designer. You extract key frames to image files first (step 3) |
| Spec in `docs/specs/` | Context only: the user stories and rules the design must serve. Read-only |

## Files

| File | Owner | Purpose |
|---|---|---|
| `docs/designs/<slug>/<name>.svg` | Designer | **The deliverable**: one file per screen, state or breakpoint |
| `docs/levi/<slug>/frames/` | Workflow | Scratch: key frames extracted from videos. Deleted at the end |
| `docs/levi/<slug>/references.md` | Workflow | Scratch: a plain description of images that exist only in the conversation. Deleted at the end |
| `docs/levi/<slug>/render/` | Workflow | Scratch: PNG renders of the SVG files, for the visual check. Deleted at the end |

`<slug>` is a short kebab-case name for what is designed, in English (for example `login-screen`). Create folders as needed. Pass the designer the exact paths it should read and write. The files the user uploaded are the user's: never move, edit or delete them.

## Steps

1. **Intake.** The request is the text plus the attachments. If there is neither text nor an attachment, ask what to design and stop. Derive the slug. List every image and video with its file path. Note the user's intent for each: recreate it, take its style, or extract its flow.
2. **Find the context.**
   - *Existing design.* List `docs/designs/` and match folders against the subject. One clear match is an update: the designer revises those files and leaves the rest as they are. Two or more equally plausible: ask the user which one (or "new design"). None: a new folder `docs/designs/<slug>/`.
   - *Spec.* List `docs/specs/` and match files by name and title. Use a clear match as context and say which in one line; with no clear match, go on without one. Never create or edit anything under `docs/specs/`.
3. **Prepare the references.** The designer works only from files, never from the conversation.
   - *Images with a file path:* pass the path.
   - *Images that exist only in the conversation* (pasted or attached with no path): write `docs/levi/<slug>/references.md` with one section per image, a plain description of what is visible and nothing else: the layout region by region, every text exactly as written, colors as hex values, sizes and spacing you can read, icons, states, and what you cannot make out. No design opinions, no additions. Name the section `Image N` and tell the designer that the description is its only view of that image.
   - *Videos and GIFs:* extract key frames into `docs/levi/<slug>/frames/`. With ffmpeg, first try scene changes, and cap them at 12 frames:

     ```bash
     ffmpeg -i <video> -vf "select='gt(scene,0.25)',scale=1280:-2" -vsync vfr -frames:v 12 docs/levi/<slug>/frames/%02d.png
     ```

     If that gives fewer than 3 frames, take one frame every few seconds instead (`-vf "fps=1/3,scale=1280:-2"`). Look at the frames, keep one per distinct screen or state and delete near-duplicates, and write `frames/index.md` listing each frame with its timestamp or order. If ffmpeg is not installed, do not guess what the video shows: tell the user and ask for screenshots of the key screens (or for ffmpeg to be installed), then continue with what you have.
4. **Designer draws.** Call `levi-designer` with: the request as the user wrote it, the intent for each reference, every reference path (images, `frames/`, `references.md`), the spec path if any, the existing design folder if updating, the output folder `docs/designs/<slug>/`, and the SVG rules below. It must:
   - decide the list of files before drawing, and keep tokens and components the same across all of them;
   - write only SVG files in the output folder, no notes or other files;
   - follow a recreate reference closely (layout, proportions, texts, colors, icons, states) and be honest about what it could not reproduce; follow a style reference for colors, type, radii and density only;
   - return in its report the file list with one line per file, the assumptions it made, what it could not reproduce, and its questions.
5. **Check the files.** Run the checker over the output folder: `python3 <this skill's folder>/scripts/check-svg.py docs/designs/<slug>/` (or `xmllint --noout` on each file if there is no Python). Then, if a renderer exists (`rsvg-convert`, `inkscape`, or headless Chrome/Chromium), render every SVG to `docs/levi/<slug>/render/<name>.png` and look at the renders. Check that nothing is cut off, overlapping or unreadable, that the texts are the right ones, and, for recreate references, that the design matches the reference. If there is no renderer, say so in the report and rely on the checker.
6. **Fix, once.** When the checker or the render check found problems, call `levi-designer` once more with the exact problems (file, what is wrong, where) and the paths of the renders and references. It fixes only those, and you run step 5 again. Do not start a third pass: report what is still wrong.
7. **Ask the user.** The designer cannot ask. Take the questions from its reports and ask them in one round (use the tool's structured question feature if it has one), each with two to four options and the recommended one first. Only ask what changes the design: missing content, a choice between layouts, an unclear reference. If the answers change files, call the designer once more with them and run step 5 again. Skip this step when there are no questions; the assumptions go in the report instead.
8. **Clean up.** Delete `frames/`, `references.md` and `render/` from `docs/levi/<slug>/`, then remove the folder if empty, and `docs/levi` if that is empty. Delete only those, only after the designs are final. Keep the SVG files, the user's uploads and the spec.
9. **Report.** Tell the user the folder, the files with one line each (what screen or state it shows), whether it is new or an update, the spec used (if any), the assumptions, what could not be reproduced from the references (photos become labeled placeholders, fonts fall back to the stack), what the checks found and fixed, and whether the render check ran. Offer the next step in one line only when it is obvious, such as the missing states or breakpoints.

## SVG rules

These go to the designer on every call. They add to the rules in its own definition.

- **Valid and self-contained.** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H">`, with a `<title>` as the first child and a `<desc>` saying what the screen is. No `<image>`, no raster data, no external files, fonts, links or scripts, no `<foreignObject>`, no animation. Photos and illustrations are drawn as simple shapes or as a labeled placeholder rectangle.
- **One artboard per file.** One screen, state or breakpoint per file, drawn on an artboard with a background rect. Name files after what they show: `<screen>.svg`, `<screen>-<state>.svg`, `<screen>-<breakpoint>.svg`, in kebab-case.
- **Size.** Use the size of the reference when there is one (its aspect ratio is kept). Otherwise: mobile 390×844, tablet 768×1024, desktop 1440×900.
- **Tokens.** Define colors, type sizes, radii and shadows once per file in a `<style>` block as classes with literal values (`.text-primary{fill:#1F2937}`), and use the classes. Do not use CSS variables: many renderers ignore them. Reuse the same values in every file of the folder, and the project's tokens when it has them.
- **Structure.** Group by what things are, with kebab-case `id`s: `header`, `nav`, `card-order`, `button-primary`, `input-email`. Repeated parts (icons, buttons) are defined once in `<defs>` and drawn with `<use>`. Ids are unique in the file.
- **Text.** Real `<text>` elements, not outlines, so the content stays readable and searchable. Use a system font stack (`font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"`), never a font loaded from a URL. Text that wraps is split into `<tspan>` lines that fit their container.
- **Content.** Texts, labels, numbers and data come from the request or the references, exactly as given. Anything else is a placeholder, written like `[Product name]` or `Lorem ipsum`, never made-up facts, names or figures.
- **Accessibility.** Text contrast WCAG 2.1 AA (4.5:1, or 3:1 for large text), touch targets at least 44px, visible focus in focus states, meaning never by color alone. A recreate reference that breaks one of these is reproduced as it is and the problem is named in the report.
