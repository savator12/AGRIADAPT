# Changelog

## Recent Updates

### Mapbox Integration
- ✅ Added interactive map for location selection in farmer registration
- ✅ Replaced manual latitude/longitude input fields with Mapbox map
- ✅ Map automatically centers on kebele location if available
- ✅ Click on map to select exact farm location
- ✅ Visual marker shows selected location

### UI Fixes
- ✅ Fixed login form input text color (now black/visible)
- ✅ Added explicit text color classes to input fields
- ✅ Improved form field visibility

### Dependencies Added
- `react-map-gl`: ^7.1.7
- `mapbox-gl`: ^3.0.1
- `@types/mapbox-gl`: ^3.1.0

### Environment Variables
- Added `NEXT_PUBLIC_MAPBOX_TOKEN` to environment configuration
- Default public token included for development

## How to Use

1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Set Mapbox token (optional for development):**
   Add to `.env`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN="your-token-here"
   ```
   Or get a free token from https://account.mapbox.com/access-tokens/

3. **Register a farmer:**
   - Navigate to "Register New Farmer"
   - Click on the map to select farm location
   - Coordinates are automatically saved
   - If no location selected, kebele center is used

## Notes

- The map uses a default public token for development
- For production, use your own Mapbox token
- Map centers on Ethiopia by default (9.1450, 38.7617)
- Zoom level adjusts based on whether location is set


