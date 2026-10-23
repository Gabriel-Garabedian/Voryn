---
name: voryn-pdf-export
description: Diagnose or change Voryn workout-sheet, assessment, progress PDF, JSON export, or Android save/cancel behavior. Use for exported content, layout, generation failures, and files that do not download or save.
---

# Voryn document export

Separate retrieval, document generation, transfer across the native bridge, destination selection, and filesystem writing. A generated Blob does not prove the file was saved on the phone.

## Code map

- PDF generation: `src/services/pdfExport.js`, bundled lazy imports of jsPDF and autoTable.
- Shared saving: `src/services/fileExport.js`; JSON payload: `dataExportService` in `src/services/index.js`.
- Android picker/write: `android/app/src/main/java/com/voryn/app/FileExportPlugin.java`; registration in `MainActivity.java`.
- Entry points: `src/views/ProfileView.jsx` and `PersonalDashboardView.jsx`.

## Work on the failing stage

- Inspect service `{ data, error }` results. A failed query must not silently become an apparently valid empty report. Verify the progress export receives actual metrics, logs, and PRs.
- Preserve bundled PDF dependencies; avoid runtime CDN scripts as a shortcut. Keep expensive libraries lazy-loaded.
- On Android, await the native save result before reporting success. Cancellation (`CANCELLED`) is a user outcome; dismiss loading state and allow another attempt. Surface write errors without claiming the file exists.
- On web, preserve the download path and safe Blob URL lifetime. A download anchor is not an implementation of Android's native file picker.
- A native plugin change needs a new APK. Updating the website cannot add native code to an installed build.

## Validate content and delivery separately

Run `src/__tests__/pdfExport.test.js` and `fileExport.test.js` for the affected service behavior. Expand with meaningful cases for the changed content, not assertions that mirror implementation wording.

For layout work, generate synthetic reports with Portuguese accents, long names, many exercises, multiple pages, long notes, empty sections, and realistic assessment/progress data. Render and inspect pages using the available PDF/browser tooling; check page breaks, clipped text, table headers, and footer overlap. Do not replace the application's jsPDF implementation with Python solely because a document-review skill uses Python.

For delivery changes, test save, cancel, repeated attempt, unavailable destination/write failure where reproducible, and opening the resulting file. Confirm native behavior on a suitable Android build/device. State separately what was generated, visually inspected, downloaded in a browser, and saved natively.
