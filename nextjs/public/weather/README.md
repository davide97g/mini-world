# Weather Icons

This folder should contain pixel-art weather icons in PNG format.

## Required Icons

The following icon files are needed (all should be PNG format):

- `sunny.png` - Clear sky (weathercode 0)
- `cloudy.png` - Partly cloudy to overcast (weathercode 1-3)
- `foggy.png` - Fog conditions (weathercode 45-48)
- `rainy.png` - Rain conditions (weathercode 51-67, 80-82)
- `snowy.png` - Snow conditions (weathercode 71-77, 85-86)
- `stormy.png` - Thunderstorm conditions (weathercode 95-99)

## Icon Specifications

- Format: PNG
- Recommended size: 32x32 or 64x64 pixels (will be scaled to 64x64 on canvas)
- Style: Pixel-art style to match the game aesthetic
- Background: Transparent (PNG with alpha channel)

## Usage

Icons are automatically loaded and displayed on the pixel map canvas at position (20, 20) when weather data is available.

