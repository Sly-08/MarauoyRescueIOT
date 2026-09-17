# RESCUE-IOT

RESCUE-IOT flood monitoring web application for Lipa City.

## GitHub Pages

The public website entry point is `index.html` at the repository root. When GitHub Pages is enabled for this repository, opening the Pages URL will load the RESCUE-IOT landing page first.

### Publish

1. Push this project to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.
5. Open the generated GitHub Pages URL. `index.html` is the landing page.

### Firebase

The frontend uses the Firebase Web SDK and can run on GitHub Pages over HTTPS. Add the GitHub Pages hostname to the Firebase Authentication authorized domains if Firebase Authentication is used there.

### Backend / SMS

GitHub Pages hosts only static frontend files. The Node.js `backend/` service is not executed by GitHub Pages and must remain deployed separately if SMS sending or other backend endpoints are required.

Do not commit `backend/.env` or any Firebase Admin service-account key. Create those files only in the private backend environment.
