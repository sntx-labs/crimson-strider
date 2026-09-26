# Crimson Strider

Private working repository for [Crimson Strider](https://labs.sntx.co/experiments/crimson-strider/). Imported from Syntax Labs version 50, commit `0dcf1d1533de3115e87fee5fb2df4a329e6032d2`, on 2026-09-26.

## Run the current Labs version

Requires Node.js 20 or newer. No dependency installation is needed for this published version.

```sh
npm run labs:dev
```

Open the localhost URL printed by the server. The original experiment path is preserved so its Syntax header, SHPanel, loading animation, mobile controls and relative asset links continue to work. Set the PORT environment variable to use a different port.

```sh
npm run labs:verify
npm run labs:build
```

The build copies the current experience to `dist/` and assembles the large assets from their checked-in parts, validating SHA-256 hashes. It does not recompile the archived authoring snapshot.

## Editing

Current runtime files: `public/experiments/crimson-strider/`. Shared controls and loading code: `public/ui/`.

The current runtime contains editable HTML/JavaScript modules.

## Publication and rights

Keep this repository private until the owner approves publication. No new blanket open-source license is assigned by this migration. Existing licenses, attribution and third-party notices remain applicable. Review bundled textures, models, fonts, shaders and dependencies before public release. Private visibility does not revoke licenses previously granted for public versions.

The running website is still deployed separately through Sites. Pushing to this repository does not redeploy or change its public URL.

To prepare runtime assets for the separate authoring snapshot, run `npm run labs:authoring`, then follow the printed npm install/build instructions. The published snapshot remains the reference for current Labs behavior.
