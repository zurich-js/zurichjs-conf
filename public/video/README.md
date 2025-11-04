# Video Assets for Hero Component

## Required Video

Place the following video in this directory:

### zurich-aerial.mp4
- **Purpose**: Full-screen looping background video
- **Format**: MP4 (H.264 codec)
- **Dimensions**: 1920x1080 or higher
- **Duration**: 10-30 seconds (will loop seamlessly)
- **File size**: < 5MB recommended (optimize for web)
- **Aspect ratio**: 16:9

## Where to Find Free Zurich Aerial Videos

### Pexels Videos
https://www.pexels.com/search/videos/zurich/
- Free, high-quality videos
- Good selection of aerial and cityscape footage
- Download in highest quality available

### Pixabay Videos
https://pixabay.com/videos/search/zurich/
- Free for commercial use
- Various Zurich city videos

### Coverr
https://coverr.co/
- Free stock videos
- Search for "city aerial" if Zurich-specific not available

### Mixkit
https://mixkit.co/free-stock-video/
- Free video clips
- City and aerial categories

## Video Optimization

### Step 1: Download
1. Choose a video with smooth, slow movement
2. Download in highest quality (1080p or 4K)
3. Select a clip that loops well (seamless beginning/end)

### Step 2: Compress with HandBrake
Download: https://handbrake.fr/

**Settings**:
- Format: MP4
- Video Codec: H.264
- Quality: RF 23-25 (good balance)
- Framerate: 30 fps
- Resolution: 1920x1080

**Target**: Under 5MB file size

### Step 3: Online Compression (Alternative)
If you don't want to install software:
- https://www.freeconvert.com/video-compressor
- https://www.videosmaller.com/

## Recommended Video Characteristics

✅ **Good**:
- Slow, smooth camera movement
- Clear, bright footage
- Aerial or elevated view
- 10-30 seconds duration
- Good weather/lighting

❌ **Avoid**:
- Shaky/handheld footage
- Rapid movements or cuts
- Dark or low-contrast
- Vertical/portrait orientation
- Watermarks

## Tips for Best Results

1. **Test Multiple Videos**: Try 2-3 different videos to find the best one
2. **Loop Point**: Ensure the video loops smoothly (end similar to beginning)
3. **Mobile Performance**: Smaller file sizes are better for mobile users
4. **Brightness**: Choose footage that remains visible with the dark overlay

## Fallback Strategy

If you can't find a suitable video:
1. Use a high-quality static image instead
2. Remove `videoSrc` from the Hero component
3. Only provide `posterSrc` or `imgFallbackSrc`
4. The component will gracefully fall back to the image

---

**Example Search Terms**:
- "zurich aerial footage"
- "zurich drone video"
- "zurich cityscape 4k"
- "switzerland city aerial"

