# Smart Cook API Integration Guide

## Overview

The Smart Cook backend has been updated to use real AI-powered APIs:
- **OpenAI Vision API (GPT-5.2)**: Analyzes fridge photos to detect ingredients
- **Spoonacular API**: Searches for recipes based on detected ingredients

## Backend Endpoints

### 1. POST `/api/scan`
Analyzes fridge images and detects ingredients using OpenAI Vision.

**Request:**
```json
{
  "image": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "success": true,
  "ingredients": [
    {
      "name": "Chicken Breast",
      "confidence": 0.95
    },
    {
      "name": "Tomatoes",
      "confidence": 0.92
    }
  ],
  "error": null
}
```

### 2. POST `/api/recipes`
Searches for recipes based on ingredients and user preferences.

**Request:**
```json
{
  "ingredients": ["Chicken", "Tomatoes", "Garlic"],
  "cuisines": ["Italian", "Chinese"],
  "dietary_restrictions": ["gluten-free"],
  "max_results": 10
}
```

**Response:**
```json
{
  "success": true,
  "recipes": [
    {
      "id": "12345",
      "title": "Chicken Stir Fry",
      "image": "https://...",
      "cuisine": "Chinese",
      "cooking_time": 25,
      "difficulty": "easy",
      "servings": 4,
      "ingredients": ["500g Chicken", "2 Bell Peppers", ...],
      "steps": ["Cut chicken...", "Heat wok...", ...],
      "missing_ingredients": []
    }
  ],
  "error": null
}
```

### 3. GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "openai_configured": true,
  "spoonacular_configured": true
}
```

## Environment Variables Setup

### Required API Keys

You need to obtain and configure the following API keys:

#### 1. OpenAI API Key
- **Purpose**: Ingredient detection via Vision API
- **Get it from**: https://platform.openai.com/api-keys
- **Model used**: GPT-5.2 with vision capabilities

#### 2. Spoonacular API Key
- **Purpose**: Recipe search and detailed recipe information
- **Get it from**: https://spoonacular.com/food-api/console
- **Free Tier**: 50 requests/day
- **Paid Plans**: Available for higher usage

### Configuration Steps

1. **Create `.env` file** in `/app/backend/` directory:
   ```bash
   cp /app/backend/.env.example /app/backend/.env
   ```

2. **Add your API keys** to `/app/backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   SPOONACULAR_API_KEY=your-spoonacular-key-here
   ```

3. **Restart the backend**:
   ```bash
   sudo supervisorctl restart backend
   ```

## Testing the Integration

### Test OpenAI Vision (Ingredient Detection)

```bash
curl -X POST http://localhost:8001/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_here"
  }'
```

### Test Spoonacular (Recipe Search)

```bash
curl -X POST http://localhost:8001/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "tomatoes", "garlic"],
    "cuisines": ["italian", "chinese"],
    "max_results": 5
  }'
```

### Test Health Check

```bash
curl http://localhost:8001/api/health
```

## Fallback Behavior

**Important**: The backend includes intelligent fallback behavior:

- **No API Keys**: If API keys are not configured, the backend will:
  - Log a warning
  - Return mocked data so the app continues to function
  - Show which APIs are not configured in the health check

- **API Errors**: If an API call fails:
  - The error is logged
  - A graceful error response is returned
  - The frontend can handle the error or show mocked data

This ensures the app works even during development without API keys!

## Frontend Integration

The mobile app automatically calls the backend endpoints:

### Camera Flow
1. User takes 2 photos of their fridge
2. Photos are converted to base64
3. Posted to `/api/scan`
4. Ingredients are displayed with confidence scores
5. User confirms/edits ingredients

### Recipe Search Flow
1. Confirmed ingredients are sent to `/api/recipes`
2. User's cuisine preferences from onboarding are included
3. Recipes are fetched and displayed
4. User can save recipes or view on YouTube

## API Rate Limits & Costs

### OpenAI Vision (GPT-5.2)
- **Pricing**: ~$0.01-0.03 per image analysis
- **Rate Limit**: Depends on your OpenAI tier
- **Recommendation**: Implement caching for repeated scans

### Spoonacular
- **Free Tier**: 50 requests/day (150 points)
- **Paid Plans**: 
  - Mega: $49/month - 50,000 requests
  - Ultra: $129/month - 150,000 requests
- **Rate Limit**: 1 request per second on free tier

## Error Handling

The backend handles various error scenarios:

1. **Invalid API Key**: Returns 500 error with "Configuration error"
2. **Quota Exceeded**: Returns 429 error with "API quota exceeded"
3. **Network Timeout**: Returns 503 error with "Service unavailable"
4. **Invalid Image**: Returns 400 error with helpful message
5. **No Ingredients**: Returns 400 error requesting at least one ingredient

## Security Best Practices

✅ **DO**:
- Keep API keys in `.env` file only
- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys periodically

❌ **DON'T**:
- Hardcode API keys in source code
- Commit `.env` file to version control
- Share API keys publicly
- Use production keys in development

## Monitoring & Debugging

### Check Backend Logs
```bash
# View recent logs
tail -f /var/log/supervisor/backend.err.log

# Check API key configuration
curl http://localhost:8001/api/health
```

### Common Issues

**Issue**: "OPENAI_API_KEY not configured"
- **Solution**: Add your OpenAI API key to `/app/backend/.env`

**Issue**: "API quota exceeded"
- **Solution**: Upgrade your Spoonacular plan or wait for quota reset

**Issue**: "Failed to analyze image"
- **Solution**: Check image format (must be JPEG/PNG) and size (< 4MB)

## Next Steps

1. Obtain API keys from OpenAI and Spoonacular
2. Add keys to `/app/backend/.env`
3. Restart backend: `sudo supervisorctl restart backend`
4. Test endpoints with curl or the mobile app
5. Monitor logs for any issues
6. Optimize API usage based on your needs

## Support

For API-specific help:
- **OpenAI**: https://platform.openai.com/docs
- **Spoonacular**: https://spoonacular.com/food-api/docs

For app-specific help:
- Check the backend logs
- Review the health check endpoint
- Test with mock data first
