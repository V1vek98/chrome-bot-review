# AuthentiScore - Chrome Extension for Review Authenticity Analysis

AuthentiScore is a Chrome extension that analyzes Google reviews to determine their authenticity by detecting potential bot-generated or fake reviews.

## Features

- **Real-time Analysis**: Analyzes reviews on Google Maps and Google Business pages instantly
- **Visual Indicators**: Color-coded authenticity scores (green/yellow/red) displayed next to each review
- **Comprehensive Algorithm**: Evaluates multiple factors including:
  - Reviewer history and contribution count
  - Language patterns and generic phrases
  - Review specificity and detail level
  - Presence of photos
  - Reviewer name authenticity
  - Sentiment balance
  - Review length

## Installation Instructions

### Developer Mode Installation (For Testing)

1. **Generate Icons**:
   - Open `create_icons.html` in your browser
   - Right-click on each canvas and save as:
     - `icons/icon16.png`
     - `icons/icon48.png`
     - `icons/icon128.png`

2. **Load the Extension**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-bot-review` directory

3. **Verify Installation**:
   - You should see the AuthentiScore extension in your extensions list
   - The extension icon should appear in your browser toolbar

## Usage

1. Navigate to a Google Maps location or Google Business page with reviews
2. Click the AuthentiScore extension icon in your toolbar
3. Click "Analyze Reviews on This Page"
4. Watch as authenticity scores appear next to each review

## Testing the Extension

### Test Locations
Visit these types of pages to test the extension:
- Google Maps restaurant pages
- Google Maps hotel pages
- Google Business listings with reviews
- Any Google page with customer reviews

### Expected Behavior
- **High Authenticity (80-100%)**: Green badge - Reviews with specific details, photos, balanced sentiment
- **Moderate Authenticity (60-79%)**: Yellow badge - Reviews with some generic elements
- **Low Authenticity (0-59%)**: Red badge - Reviews with many suspicious characteristics

### Scoring Factors

The algorithm analyzes:
1. **Reviewer History (25%)**: Single-review accounts are suspicious
2. **Generic Language (20%)**: Common phrases like "great service" reduce score
3. **Review Specificity (15%)**: Mentions of specific items/experiences increase score
4. **Photos (10%)**: Reviews with photos are more trustworthy
5. **Reviewer Name (10%)**: Generic or suspicious names reduce score
6. **Sentiment Balance (10%)**: Extreme ratings with minimal text are suspicious
7. **Text Length (10%)**: Very short reviews score lower

## Development

### Project Structure
```
chrome-bot-review/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── content_script.js     # Main analysis logic
├── content_styles.css    # Injected styles
├── background.js         # Service worker
├── create_icons.html     # Icon generator
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Functions

- `calculateAuthenticityScore()`: Core scoring algorithm
- `scrapeReviews()`: Extracts review data from the page
- `injectScores()`: Adds visual badges to reviews
- `createScoreElement()`: Creates the score badge element

## Troubleshooting

1. **No reviews found**: Ensure you're on a Google page with reviews visible
2. **Scores not appearing**: Try refreshing the page and clicking analyze again
3. **Extension not working**: Check that the extension is enabled in chrome://extensions/

## Future Enhancements

- Support for other review platforms (Yelp, TripAdvisor)
- Machine learning integration for improved accuracy
- Bulk analysis and reporting features
- User feedback mechanism for score accuracy
- Historical tracking of review patterns

## Privacy

AuthentiScore operates entirely locally in your browser. No data is sent to external servers. The extension only analyzes publicly visible review data on the pages you visit.

## License

This project is for educational and personal use. Please respect Google's Terms of Service when using this extension.