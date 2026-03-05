# Copa bplay - Stream Ranking Table

A modern, vibrant ranking table designed for live streaming with real-time updates, urban graffiti styling, and responsive design.

## Quick Start

### View the Ranking Table
The app is already running. Open your browser to see the live ranking display.

### Access Admin Panel
Add `?admin=true` to your URL to access the management interface where you can:
- Add/edit/delete players
- Update points in real-time
- Automatically recalculate positions

## What's Included

### Main Features
- **Urban Graffiti Font**: Bold "Bangers" Google Font for energetic, street-style appeal
- **Top 3 Highlighting**:
  - 1st Place: Gold gradient with crown icon and pulse animation
  - 2nd Place: Silver gradient with medal icon
  - 3rd Place: Bronze gradient with medal icon
- **Vibrant Colors**: Purple, blue, and pink gradient background with attention-grabbing design
- **Real-time Updates**: Auto-refreshes every 30 seconds + instant updates via Supabase subscriptions
- **Responsive Design**: Works perfectly on all devices (mobile, tablet, desktop, stream overlays)
- **Live Timestamp**: Shows last update time
- **Admin Panel**: Easy-to-use interface for managing rankings during streams

### Database
- Supabase PostgreSQL backend
- Real-time subscriptions for instant updates
- Secure with Row Level Security (RLS) enabled
- Sample data pre-loaded with 10 players

### Sample Data
The app includes 10 sample players with rankings:
1. Carlos "El Tigre" Méndez - 2,850 points
2. Ana "La Reina" Rodríguez - 2,720 points
3. Miguel "Destroyer" Santos - 2,680 points
... and 7 more

## File Structure

```
src/
├── components/
│   ├── RankingTable.tsx    # Main ranking display for stream
│   └── AdminPanel.tsx       # Admin interface for managing data
├── lib/
│   └── supabase.ts          # Database client configuration
├── App.tsx                  # Main app with routing
└── index.css                # Tailwind CSS styles

public/
└── (place your logos and images here)

Documentation/
├── README.md               # This file - quick start
├── USAGE_GUIDE.md          # Detailed usage instructions
└── CUSTOMIZATION.md        # How to add your assets and customize design
```

## How to Update Rankings

### Easiest Method: Admin Panel
1. Navigate to `http://localhost:5173/?admin=true`
2. Edit player names and points directly
3. Click "Recalculate Positions" to auto-sort by points
4. Click "Save All Changes"
5. Changes appear on stream display within seconds

### Alternative: Supabase Dashboard
1. Visit your Supabase project dashboard
2. Go to Table Editor > rankings
3. Edit any row directly
4. Changes sync automatically

## Customization

Since I couldn't access your Google Drive assets, you'll need to add:

1. **bplay Logo**: Place in `public/` folder and update `RankingTable.tsx` line 175
2. **bplay Footer**: Update footer section in `RankingTable.tsx` line 183
3. **Colors**: Customize gradients to match your stream theme
4. **Excel Import**: Export your Copa bplay Excel to CSV and import via Supabase

See `CUSTOMIZATION.md` for detailed instructions with code examples.

## URLs

- **Stream Display**: `http://localhost:5173/`
- **Admin Panel**: `http://localhost:5173/?admin=true`

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Supabase (database + real-time)
- Lucide React (icons)
- Google Fonts (Bangers)

## Next Steps

1. Read `CUSTOMIZATION.md` to add your bplay logo and footer
2. Import your Excel data via Admin Panel or Supabase
3. Adjust colors to match your stream theme
4. Test the display on different screen sizes
5. Use the stream display URL in your streaming software (OBS, Streamlabs, etc.)

## Using in OBS/Streaming Software

1. Add a "Browser Source" in your streaming software
2. Set URL to: `http://localhost:5173/`
3. Set dimensions (recommended: 1920x1080 or 1280x720)
4. Enable "Refresh browser when scene becomes active" for live updates
5. Adjust opacity/position as needed for your stream layout

## Support

- Check `USAGE_GUIDE.md` for operational details
- Check `CUSTOMIZATION.md` for styling changes
- Check browser console for any errors
- Verify `.env` file has correct Supabase credentials

## Preview

The ranking table features:
- Large, bold titles with graffiti font
- Animated flames and trophy icons
- Special highlighting for top 3 positions
- Clean, card-based layout for each player
- Smooth hover effects and transitions
- Professional footer for licenses

Built with attention to detail and ready for production streaming!
