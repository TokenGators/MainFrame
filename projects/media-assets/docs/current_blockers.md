# Gatorpedia Cycle B - Current Blockers

## Status: STALLED (TypeScript build failure)

### 1. Frontend: Missing shadcn/ui Components
- **Description:** `AssetBrowser.tsx` and `NFTExplorer.tsx` are attempting to import `Select` and `Card` components that do not exist in the `ui/src/components/ui` directory.
- **Impact:** Prevents `npx tsc` and production builds.
- **Target Fix:** Run `npx shadcn-ui@latest add select card` in the `ui/` directory.

### 2. Frontend: Type Mismatch in NFT Explorer
- **Description:** `NFTExplorer.tsx` (line 295) is trying to render a property typed as `unknown`.
- **Impact:** Prevents successful compilation.
- **Target Fix:** Identify the specifically rendered property (likely a trait value) and cast it to `string` or `React.ReactNode`.

### 3. Regression Risk: Cycle A Integrity
- **Status:** ✅ STABLE.
- **Note:** All backend API endpoints (status, assets, nfts, tags, export) and the dataset integrity (counts/validation) passed the `run_qa_tests.sh` suite.
