# REST Client — Gap Analysis vs Postman

_Deep investigation of `/rest-client` — what works, what is present in the UI but broken or incomplete, and what is missing entirely._

---

## What Is Fully Implemented

| Feature                                                        | Notes                                |
| -------------------------------------------------------------- | ------------------------------------ |
| HTTP methods (GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD)          | ✅                                   |
| Query parameters (key-value, enable/disable per row)           | ✅                                   |
| Request headers (key-value, enable/disable per row)            | ✅                                   |
| Body types: JSON, text, XML, HTML, form-data, urlencoded, none | ✅                                   |
| Auto Content-Type header on body type change                   | ✅                                   |
| Auth: Bearer Token, Basic Auth, API Key (header or query)      | ✅                                   |
| Environment variables with `{{variable}}` interpolation        | ✅ (URL, headers, body, auth fields) |
| Collections: create, save, rename requests, delete requests    | ✅                                   |
| Postman collection import (v2.1 JSON)                          | ✅ (partial — see bugs below)        |
| Postman collection export per collection                       | ✅ (partial — see bugs below)        |
| Export all collections                                         | ✅                                   |
| History (last 100), reload from history, clear                 | ✅                                   |
| Multiple tabs                                                  | ✅                                   |
| cURL import (dialog + auto-detect on paste in URL bar)         | ✅                                   |
| Code snippet: cURL, HTTP, JS Fetch, Axios, Python, Go          | ✅                                   |
| Response body, response headers, status/time/size              | ✅                                   |
| Copy response to clipboard                                     | ✅                                   |
| Command palette (⌘K)                                           | ✅                                   |
| Keyboard shortcuts (⌘Enter send, ⌘/ shortcuts, ? help)         | ✅                                   |
| Server proxy (routes through `/api/proxy` to bypass CORS)      | ✅                                   |
| Local CORS proxy URL rewriting                                 | ✅                                   |
| SSL verification toggle (server proxy mode only)               | ✅                                   |
| Timeout setting                                                | ✅                                   |
| Dark mode                                                      | ✅                                   |

---

## Bugs — UI Is Present but Implementation Is Wrong or Incomplete

These are the most impactful issues because users can see the feature but it silently produces incorrect results.

### 1. Auth data is never exported or imported in Postman collections

**Export** (`exportCollection`, line ~1099):

```ts
auth: { type: 'none' } as AuthConfig,  // ← hardcoded, auth config is discarded
```

The actual `r.auth` is never written into the Postman JSON. Exporting a collection with Bearer/Basic/API Key auth and re-importing it produces requests with no auth.

**Import** (`importPostmanCollection`, line ~1066):

```ts
auth: { type: 'none' } as AuthConfig,  // ← Postman `request.auth` field is never read
```

Auth defined in Postman collections (Bearer, Basic, OAuth2 in the JSON) is silently ignored on import.

---

### 2. Query params (Params tab) are lost on Postman export

`exportCollection` writes:

```ts
url: { raw: r.url },  // ← r.params[] is never serialized into url.query[]
```

Postman v2.1 format expects a `query` array in the URL object. Any params saved in the Params tab are stripped on export and not restored on re-import.

---

### 3. form-data and urlencoded bodies are lost on Postman export

`exportCollection` always uses `mode: 'raw'`:

```ts
body: r.body ? { mode: 'raw', raw: r.body } : undefined,
```

When `bodyType` is `form-data` or `urlencoded`, `r.body` is a serialized JSON string of `KeyValue[]` (the internal format), not the Postman `formdata`/`urlencoded` array. On re-import the body will be garbled raw JSON.

---

### 4. Code snippets do not resolve environment variables

`generateCodeSnippet` (line ~1129) uses raw tab values directly:

```ts
const { method, url, headers, params, body, bodyType, auth } = activeTab;
```

`interpolateEnv` is never called. If the active URL is `{{baseUrl}}/api/users`, the generated cURL snippet contains the literal `{{baseUrl}}` instead of the resolved value.

---

### 5. "Environments" nav link in the header bar is dead

Lines ~1633–1635:

```tsx
<span className="cursor-pointer hover:text-gray-900 dark:hover:text-white">Environments</span>
```

It has cursor pointer and hover styling but **no `onClick` handler**. Clicking it does nothing. It should open the environments side panel.

---

### 6. Body tab header always shows "raw" regardless of body type

Line ~2470:

```tsx
<span className="font-semibold text-[#5b5bff]">raw</span>
```

This label is hardcoded. When the user selects `form-data` or `urlencoded`, the header still shows "raw", which is misleading.

---

### 7. No cancel button for in-flight requests

`handleSend` creates an `AbortController` inside `sendDirectRequest`, but there is no state or callback exposing it to the UI. Once the user clicks "Send", there is no way to cancel the request other than waiting for timeout. The loading overlay shows a spinner but no cancel action.

---

### 8. "Add new" in collections sidebar fails silently with no collections

When `collections` is empty, the inline-save collection dropdown renders with no items. If the user clicks "Save request" without any collection selected, `saveRequestToCollection` receives an empty `collectionId` and shows a toast `'Select a collection'` — but the "Create new collection" option is missing from that dropdown (it only appears in the full Save Dialog, not the inline one).

---

## Missing Features (Not Implemented at All)

Ordered roughly by impact / how often Postman users rely on them.

### High Impact

| Feature                                | Postman Equivalent                      | Notes                                                                                  |
| -------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| **Delete collection**                  | Collections → right-click → Delete      | Only individual requests can be deleted; entire collections cannot be removed          |
| **Rename collection**                  | Double-click collection name            | Collection names can never be changed after creation                                   |
| **Response body syntax highlighting**  | Pretty / Raw / Preview tabs             | Response is shown in a plain `<pre>`. No JSON tree, no syntax colours, no HTML preview |
| **Response body search**               | Search bar in response panel            | No way to find text inside a large response                                            |
| **Save response to file**              | "Save Response" button                  | Only copy-to-clipboard is available                                                    |
| **Request cancel**                     | Cancel button while loading             | See bug #7 — no abort UI                                                               |
| **Tab persistence across page reload** | Tabs survive browser refresh in Postman | All unsaved tabs are lost on refresh                                                   |

### Medium Impact

| Feature                                   | Postman Equivalent                                        | Notes                                                                    |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| **OAuth 2.0 auth**                        | Authorization → OAuth 2.0                                 | Very common in enterprise APIs; not implemented (no token fetch flow)    |
| **Collection-level auth**                 | Collection → Edit → Authorization → inherited by requests | Auth is per-request only                                                 |
| **Collection-level variables**            | Collection variables (separate from environments)         | No scoped variables per collection                                       |
| **Duplicate a saved request**             | Right-click → Duplicate                                   | Cannot copy an existing saved request                                    |
| **Move/copy request between collections** | Drag-and-drop or right-click → Move to                    | Requests are locked to their original collection                         |
| **History search/filter in sidebar**      | History panel has a search box                            | History panel has no search; only the command palette searches history   |
| **File upload in form-data**              | form-data row → "File" type selector                      | Only text values supported in form-data rows; cannot attach binary files |
| **Bulk enable/disable rows**              | "Bulk Edit" toggle in headers/params                      | No way to toggle all rows at once                                        |

### Lower Impact

| Feature                               | Postman Equivalent                         | Notes                                                      |
| ------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **Pre-request scripts**               | Scripts → Pre-request                      | No JavaScript scripting support                            |
| **Post-response tests**               | Scripts → Post-response                    | No automated assertions / test writing                     |
| **Collection runner**                 | Runner — execute all requests sequentially | No batch execution                                         |
| **OpenAPI / Swagger import**          | Import → OpenAPI 3.0 / Swagger 2.0         | Only Postman v2.1 JSON format supported                    |
| **Response cookies tab**              | Cookies panel in response                  | Response cookies not displayed separately                  |
| **Header presets**                    | Header presets / manage presets            | No reusable header sets                                    |
| **Request description field**         | "Description" markdown field per request   | No documentation/notes on saved requests                   |
| **Folder nesting inside collections** | Sub-folders in a collection                | All requests are flat inside a collection; no sub-grouping |

---

## Summary Table

| Category                               | Count |
| -------------------------------------- | ----- |
| Fully implemented ✅                   | 26    |
| Present in UI but broken/incomplete 🐛 | 8     |
| Missing entirely ❌                    | 20    |

**Highest priority fixes** (bugs with silent data loss):

1. Auth not exported/imported in Postman collections (bugs #1)
2. Params and form-data lost on export (bugs #2, #3)
3. Code snippets show raw `{{variables}}` (bug #4)
4. Dead "Environments" nav link (bug #5)

**Highest priority new features** (most user-visible gaps):

1. Delete & rename collections
2. Response body syntax highlighting / pretty-print
3. Cancel in-flight request
4. Tab persistence across reload
