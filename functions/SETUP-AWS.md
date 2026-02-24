# Profile photo validation (AWS Rekognition) – setup

The `validateProfilePhoto` Cloud Function checks that profile images have a human face and are not celebrity/stock photos. It uses the **same AWS credentials** as your mobile app.

## 1. Use your existing AWS keys

Use the same **AWS Access Key ID** and **AWS Secret Access Key** that you use in your mobile app (e.g. from mobile’s `.env`).

The IAM user must have:
- `rekognition:DetectFaces`
- `rekognition:RecognizeCelebrities`

(e.g. attach `AmazonRekognitionReadOnlyAccess` or a custom policy with those actions.)

## 2. Set credentials for the **deployed** function

You can use either **A** (recommended, no deprecation) or **B** (works today; deprecated 2026+).

### Option A – Use a `.env` file (recommended; no deprecation)

1. Create **`functions/.env`** in the functions folder.
2. Add (same values as in your mobile app):

   ```
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

3. Add **`functions/.env`** to `.gitignore` so you don’t commit secrets.
4. Deploy (see step 3). The function reads these env vars and no `functions.config()` is used.

### Option B – Use Firebase config (deprecated; avoid for new setup)

From your **project root**, run:

```bash
firebase functions:config:set aws.access_key_id="YOUR_AWS_ACCESS_KEY_ID" aws.secret_access_key="YOUR_AWS_SECRET_KEY"
```

Replace with your real values. You will see a deprecation warning; consider migrating to Option A (or `firebase functions:config:export` to params) before March 2026.

## 3. Deploy the function

Deploy to the **ybedatingapp** project (not akkare-4847a). From project root:

```bash
firebase use ybedatingapp
firebase deploy --only functions
```

Or: `npm run deploy:functions`

After this, the web app’s profile photo upload will call this function; no AWS keys go into the web app.

## 4. (Optional) Local testing with emulator

To test locally, the function can read from a `.env` file **inside** the `functions` folder (this file is not deployed):

1. Create `functions/.env` (add it to `.gitignore` if it isn’t already).
2. Add:

   ```
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

3. Run the emulator:

   ```bash
   cd functions && npm install && cd ..
   firebase emulators:start --only functions
   ```

## 5. Verify

1. In Firebase Console → **Functions**, confirm `validateProfilePhoto` is listed.
2. In your web app, upload a profile photo: valid selfie should succeed; celebrity/stock or no face should show an error.

## Troubleshooting

- **“Photo validation is not configured”**  
  Credentials are missing in the deployed function. Redo step 2 and deploy again.

- **“Could not process the image”**  
  The function cannot download the image (e.g. wrong Storage URL or permissions). Ensure the web app uploads to Firebase Storage and passes the download URL to the function.

- **Rekognition errors (e.g. AccessDenied)**  
  Check IAM permissions for `rekognition:DetectFaces` and `rekognition:RecognizeCelebrities` for the key you use.
