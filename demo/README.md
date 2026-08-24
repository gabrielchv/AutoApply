# AutoApply demo pages

Simulated job application pages for testing the [AutoApply](../README.md) browser
extension. Self-contained static HTML, served by a zero-dependency Node server,
containerized and deployable to Google Cloud Run via Terraform.

## Pages

| Page | What it tests |
| --- | --- |
| `greenhouse.html` | `label[for]` fields, hidden file input behind an "Attach resume" button, work-auth radio, source select, open cover-letter question. |
| `lever.html` | Card layout, many selects/radios, salary and voluntary self-ID fields the extension should skip. |
| `workday.html` | SPA look, blur validation, custom uploader that rejects automated file attach (amber manual-attach highlight). |
| `aria.html` | No `label[for]`; labels via `aria-labelledby`, `aria-label`, placeholder, and nearby text. |
| `wizard.html` | Three-step wizard; hidden steps are skipped, so one *Fill this page* per step. |
| `iframe.html` | Job posting in the top frame (JSON-LD), form embedded in an iframe. |

Every job page carries a schema.org `JobPosting` JSON-LD block so the extension's
job-context extractor uses the structured-data path.

## Run locally

```sh
node server.js
# → http://localhost:8080/
```

## Test with the extension

1. Build and load the extension: `pnpm build` then load `.output/chrome-mv3`
   unpacked at `chrome://extensions`.
2. Configure your LLM provider + API key and upload a CV (options page).
3. Open a demo page, click the AutoApply icon, and hit **Fill this page**.

## Deploy to Cloud Run with Terraform

1. Set your project in `terraform/terraform.tfvars` (copy from
   `terraform.tfvars.example`).
2. Create the Artifact Registry repo and Cloud Run service:

   ```sh
   cd terraform
   terraform init
   terraform apply
   ```

3. Build and push the image (run from the repo root):

   ```sh
   gcloud builds submit demo \
     --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/autoapply-demo/autoapply-demo:latest"
   ```

4. Point the service at the pushed image:

   ```sh
   gcloud run services update autoapply-demo \
     --region "${REGION}" \
     --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/autoapply-demo/autoapply-demo:latest"
   ```

Note: after step 2 the service's first revision stays not-ready until the image
exists (step 3+4). The service is public (`allUsers` → `roles/run.invoker`).

### No-Terraform alternative

One command via Cloud Build buildpacks, no Terraform:

```sh
gcloud run deploy autoapply-demo --source demo --region us-central1 --allow-unauthenticated
```
