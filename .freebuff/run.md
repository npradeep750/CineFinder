# Preview run instructions

## Reproduce the workspace artifacts

- From the project root, use the `frontend` directory.
- Install the locked frontend dependencies with `npm install` in `frontend`.
- No environment file is required for the current frontend; runtime configuration is already contained in the application source.

## Run the preview server

- Build the frontend with `npm run build` in `frontend`.
- Start the production server on the default preview port with `npm run start -- -p 3000` in `frontend`.
- If port 3000 is occupied, use an available port and register that server URL with the preview.
