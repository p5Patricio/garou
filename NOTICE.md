# Third-party notices

Garou is a personal project; its own code has no separate license file requirement beyond
[LICENSE](LICENSE). This file covers third-party assets bundled into the app.

## Muscle map body outlines

The front/back body figures the muscle map is drawn from (`assets/data/body_map.json`) are
derived from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used
under the **MIT License** and reproduced below. MuscleMap ships its path data as Swift source
rather than `.svg` files; the paths were converted to a JSON module (male figure only), each
muscle slug was consolidated down to Garou's own 12 `grupo_muscular` groups (e.g. `obliques`,
`serratus`, and `hip-flexors` all fold into `Abdomen` — Garou's exercise catalog doesn't track
those separately), and nothing else about the artwork was changed. Not an original Garou
illustration — see `src/constants/muscleRegions.ts`.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise library data & media

Garou's exercise library (search, GIF viewer) obtains both through
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset), which
licenses them differently.

The exercise names, categories, and Spanish instruction steps
(`assets/data/exercises_dataset.json`, trimmed from the upstream dataset — see
`src/data/exerciseDataset.ts`) are covered by that dataset's MIT license.

The GIF/image media itself is **not** covered by that MIT license. Its ownership is contested:
the dataset attributes it to © Gym visual via a permission granted to that dataset specifically
(not clearly transferable), while the dataset's own upstream source, ExerciseDB/AscendAPI,
separately claims ownership and prohibits redistributing the media as a standalone package. Garou
does not bundle or persist this media — it is fetched from a CDN at view time and cached to disk
by `expo-image`, for personal use, matching the decision documented in `src/data/exerciseDataset.ts`.
If you fork Garou and plan to distribute it beyond personal/close use, revisit this before you do.
