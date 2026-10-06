# Crimson Strider

Private working repository for [Crimson Strider](https://labs.sntx.co/experiments/crimson-strider/). Updated from Syntax Labs version 62, commit `c656d1746d091eefbc1013a7e458aa8012f7a52f`, on 2026-10-03.

## Run the current Labs version

Requires Node.js 20 or newer. No dependency installation is needed for this published version.

```sh
git clone https://github.com/sntx-labs/crimson-strider.git
cd crimson-strider
npm run labs:verify
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

## Project links and coding-assistant prompt

The in-project GitHub action links to this SNTX-Labs repository. Copy prompt includes this clone URL, the Labs preview/build workflow, scene-specific editing paths, and attribution. The shared project-card module was updated on 2026-10-06 from Syntax Labs source commit `02aca49000d891df21763798c4170638d5cc27a5`; scene files and their original snapshot provenance above are unchanged.

`labs:verify` checks the reference file hashes before editing. Expected mismatches after intentional runtime edits should be reviewed and the snapshot manifest updated deliberately; do not suppress unexplained differences. `labs:build` assembles the runtime and does not recompile an authoring snapshot.

Follow [@taylor_sntx on Twitter/X](https://x.com/taylor_sntx) for more experiments. Want an experience like this, designed for your product? Work with Syntax on a custom implementation: [sntx.co](https://sntx.co/).

The custom-implementation offer is also shown in the project card and copied prompt. It is an invitation to commission work, not an additional license restriction.
