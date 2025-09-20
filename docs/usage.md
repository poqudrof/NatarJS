# Usage

## Development

- Start the development server:
  ```bash
  npm run start
  ```
  This will open the project in your default browser.

- Start json-server:
  ```bash
  json-server --port 5000 markerLinks.json
  ```

- Start the json editor UI:
  ```bash
  yarn manage
  ```

- Build a PDF from the json editor UI:
  ```bash
  ruby tracks.rb
  ```

## Production

- Create a production build:
  ```bash
  npm run build
  ```
  This will generate the optimized output in the dist folder.

- To serve the production build, use a simple HTTP server or include the build files in your preferred web server.
  
## Testing

To manually test the pose estimation:
- Point your webcam at a QR code with known dimensions (e.g., a square of 40mm wide).
- Adjust the focal length or QR code dimensions in the code if needed.
