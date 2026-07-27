# Third-party notices

## Wacl

This project redistributes prebuilt Wacl assets:

- `public/vendor/wacl/require.js`
- `public/vendor/wacl/tcl/wacl.js`
- `public/vendor/wacl/tcl/wacl.wasm`
- `public/vendor/wacl/tcl/wacl-library.data`
- `public/vendor/wacl/tcl/wacl-custom.data`

Upstream project: <https://github.com/ecky-l/wacl>

Wacl is distributed under the BSD 3-Clause License. The complete notice is preserved at `public/vendor/wacl/LICENSE`.

The bundled Tcl runtime and library are distributed under the Tcl license terms. The complete notice is preserved at `public/vendor/wacl/license.terms`.

Two compatibility-only changes are applied to the prebuilt JavaScript bundle:

1. Guard cleanup of `window.Module` so the bundle can run inside a Web Worker.
2. Route two WebAssembly feature-probe messages to debug logging instead of browser error logging.

No changes are made to the Tcl or WebAssembly binaries.
