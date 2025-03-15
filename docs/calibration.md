# Calibration & Troubleshooting

## Calibration

- On the projector, open the page `calib.html`.
- Adjust the sliders and hit the save button.
- Open `FFT.html` to match the calibration, record the video, and save the locations.

## Issue Solving

**Parcel Watch Error:**
If you encounter an error such as:
```
Expected content key 2d39cdf7c618ab5b to exist.
```
Solution:
```bash
rm -rf .parcel-cache
```
(See Parcel’s GitHub issue tracker for more details: https://github.com/parcel-bundler/parcel/issues/8874 )
