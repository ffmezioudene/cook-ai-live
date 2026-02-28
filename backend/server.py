from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import httpx
import base64
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'smart_cook_db')]

# API Keys from environment
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
SPOONACULAR_API_KEY = os.environ.get('SPOONACULAR_API_KEY', '')

# Create the main app
app = FastAPI(title="Smart Cook API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# === MODELS ===

class DetectedIngredient(BaseModel):
    name: str
    confidence: float = Field(ge=0.0, le=1.0)

class ScanResponse(BaseModel):
    success: bool
    ingredients: List[DetectedIngredient] = []
    error: Optional[str] = None

class RecipeRequest(BaseModel):
    ingredients: List[str]
    cuisines: Optional[List[str]] = []
    dietary_restrictions: Optional[List[str]] = []
    max_results: int = Field(default=10, ge=1, le=100)

class RecipeIngredient(BaseModel):
    name: str
    amount: Optional[str] = None

class Recipe(BaseModel):
    id: str
    title: str
    image: Optional[str] = None
    cuisine: str
    cooking_time: int
    difficulty: str
    servings: int
    ingredients: List[str]
    steps: List[str]
    missing_ingredients: Optional[List[str]] = []

class RecipesResponse(BaseModel):
    success: bool
    recipes: List[Recipe] = []
    error: Optional[str] = None

# === HELPER FUNCTIONS ===

async def analyze_image_with_openai(image_base64: str) -> List[DetectedIngredient]:
    """
    Use OpenAI Vision API to detect ingredients in image
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not configured, using mock data")
        # Return mock data if no API key
        return [
            DetectedIngredient(name="Chicken Breast", confidence=0.95),
            DetectedIngredient(name="Tomatoes", confidence=0.92),
            DetectedIngredient(name="Onions", confidence=0.88),
            DetectedIngredient(name="Garlic", confidence=0.85),
            DetectedIngredient(name="Bell Peppers", confidence=0.90),
        ]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        # Initialize chat with OpenAI
        chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"scan_{datetime.utcnow().timestamp()}",
            system_message="You are an expert at identifying food items and ingredients. Analyze images and return a structured JSON list of detected ingredients."
        ).with_model("openai", "gpt-5.2")
        
        # Create message with image
        user_message = UserMessage(
            text="""Analyze this fridge/food image and detect all visible food items and ingredients. 
            Return ONLY a JSON array with this exact format:
            [{"name": "ingredient name", "confidence": 0.95}]
            
            Rules:
            - confidence should be between 0.0 and 1.0
            - Only include actual food items/ingredients you can see
            - Be specific (e.g., "Cherry Tomatoes" not just "Tomatoes")
            - Return at least 5 items if visible
            """,
            file_contents=[ImageContent(image_base64=image_base64)]
        )
        
        # Get response
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Extract JSON from response (handle markdown code blocks)
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            ingredients_data = json.loads(response_text)
            ingredients = [DetectedIngredient(**item) for item in ingredients_data]
            return ingredients[:15]  # Limit to 15 ingredients
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            logger.error(f"Response was: {response}")
            # Return at least some ingredients from text parsing
            return [
                DetectedIngredient(name="Unknown Item 1", confidence=0.5),
                DetectedIngredient(name="Unknown Item 2", confidence=0.5),
            ]
    
    except Exception as e:
        logger.error(f"OpenAI Vision error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")

async def search_recipes_spoonacular(
    ingredients: List[str],
    cuisines: List[str] = [],
    dietary_restrictions: List[str] = [],
    max_results: int = 10
) -> List[Recipe]:
    """
    Search for recipes using Spoonacular API
    """
    if not SPOONACULAR_API_KEY:
        logger.warning("SPOONACULAR_API_KEY not configured, using mock data")
        # Return mock recipes if no API key
        return [
            Recipe(
                id="1",
                title="Chicken Stir Fry",
                image="https://images.unsplash.com/photo-1603133872878-684f208fb84b",
                cuisine="Chinese",
                cooking_time=25,
                difficulty="easy",
                servings=4,
                ingredients=["Chicken", "Bell Peppers", "Onions", "Soy Sauce"],
                steps=["Cut ingredients", "Heat wok", "Stir fry", "Serve"],
                missing_ingredients=[]
            ),
            Recipe(
                id="2",
                title="Tomato Pasta",
                image="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9",
                cuisine="Italian",
                cooking_time=20,
                difficulty="easy",
                servings=4,
                ingredients=["Pasta", "Tomatoes", "Garlic", "Olive Oil"],
                steps=["Boil pasta", "Make sauce", "Combine", "Serve"],
                missing_ingredients=["Pasta"]
            )
        ]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # Step 1: Search by ingredients
            ingredient_query = ",".join(ingredients)
            search_params = {
                "apiKey": SPOONACULAR_API_KEY,
                "ingredients": ingredient_query,
                "number": max_results,
                "ranking": 2,  # Minimize missing ingredients
                "addRecipeInformation": True,
            }
            
            # Add cuisine filter if provided
            if cuisines:
                search_params["cuisine"] = ",".join(cuisines)
            
            # Add dietary restrictions if provided
            if dietary_restrictions:
                search_params["intolerances"] = ",".join(dietary_restrictions)
            
            response = await http_client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params=search_params
            )
            response.raise_for_status()
            search_results = response.json()
            
            recipes = []
            for result in search_results[:max_results]:
                try:
                    # Get detailed recipe information
                    detail_params = {
                        "apiKey": SPOONACULAR_API_KEY,
                        "includeNutrition": False
                    }
                    
                    detail_response = await http_client.get(
                        f"https://api.spoonacular.com/recipes/{result['id']}/information",
                        params=detail_params
                    )
                    detail_response.raise_for_status()
                    recipe_detail = detail_response.json()
                    
                    # Extract ingredients
                    ingredient_list = [
                        ing.get('original', ing.get('name', ''))
                        for ing in recipe_detail.get('extendedIngredients', [])
                    ]
                    
                    # Extract steps
                    steps = []
                    for instruction_group in recipe_detail.get('analyzedInstructions', []):
                        for step in instruction_group.get('steps', []):
                            steps.append(step.get('step', ''))
                    
                    # If no structured steps, use instructions text
                    if not steps and recipe_detail.get('instructions'):
                        steps = [recipe_detail['instructions']]
                    
                    # Determine missing ingredients
                    missed = [ing.get('name', '') for ing in result.get('missedIngredients', [])]
                    
                    # Map difficulty
                    difficulty = "easy"
                    if recipe_detail.get('readyInMinutes', 0) > 45:
                        difficulty = "medium"
                    if recipe_detail.get('veryHealthy'):
                        difficulty = "medium"
                    
                    # Get cuisine
                    cuisines_list = recipe_detail.get('cuisines', [])
                    cuisine = cuisines_list[0] if cuisines_list else "International"
                    
                    recipes.append(Recipe(
                        id=str(result['id']),
                        title=recipe_detail.get('title', 'Unknown Recipe'),
                        image=recipe_detail.get('image'),
                        cuisine=cuisine,
                        cooking_time=recipe_detail.get('readyInMinutes', 30),
                        difficulty=difficulty,
                        servings=recipe_detail.get('servings', 4),
                        ingredients=ingredient_list,
                        steps=steps if steps else ["No instructions available"],
                        missing_ingredients=missed
                    ))
                
                except Exception as e:
                    logger.error(f"Failed to get recipe details for ID {result.get('id')}: {str(e)}")
                    continue
            
            return recipes
    
    except httpx.HTTPStatusError as e:
        logger.error(f"Spoonacular API error: {e.response.status_code} - {e.response.text}")
        if e.response.status_code == 402:
            raise HTTPException(status_code=429, detail="API quota exceeded")
        elif e.response.status_code == 401:
            raise HTTPException(status_code=500, detail="Invalid Spoonacular API key")
        raise HTTPException(status_code=500, detail="Recipe search failed")
    except Exception as e:
        logger.error(f"Recipe search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search recipes: {str(e)}")

# === API ENDPOINTS ===

@api_router.get("/")
async def root():
    return {"message": "Smart Cook API", "version": "1.0.0"}

@api_router.post("/scan", response_model=ScanResponse)
async def scan_ingredients(image_data: dict):
    """
    Analyze fridge image and detect ingredients using OpenAI Vision
    
    Expects: {"image": "base64_encoded_image_string"}
    Returns: List of detected ingredients with confidence scores
    """
    try:
        if 'image' not in image_data:
            raise HTTPException(status_code=400, detail="Missing 'image' field in request")
        
        image_base64 = image_data['image']
        
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        logger.info(f"Analyzing image ({len(image_base64)} chars)")
        
        # Analyze image with OpenAI
        ingredients = await analyze_image_with_openai(image_base64)
        
        logger.info(f"Detected {len(ingredients)} ingredients")
        
        return ScanResponse(
            success=True,
            ingredients=ingredients
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan error: {str(e)}")
        return ScanResponse(
            success=False,
            ingredients=[],
            error=str(e)
        )

@api_router.post("/recipes", response_model=RecipesResponse)
async def get_recipes(request: RecipeRequest):
    """
    Get recipe recommendations based on ingredients and preferences
    
    Uses Spoonacular API to find matching recipes
    """
    try:
        if not request.ingredients:
            raise HTTPException(status_code=400, detail="At least one ingredient required")
        
        logger.info(f"Searching recipes for {len(request.ingredients)} ingredients")
        logger.info(f"Cuisines filter: {request.cuisines}")
        
        # Search recipes
        recipes = await search_recipes_spoonacular(
            ingredients=request.ingredients,
            cuisines=request.cuisines,
            dietary_restrictions=request.dietary_restrictions,
            max_results=request.max_results
        )
        
        logger.info(f"Found {len(recipes)} recipes")
        
        return RecipesResponse(
            success=True,
            recipes=recipes
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recipe search error: {str(e)}")
        return RecipesResponse(
            success=False,
            recipes=[],
            error=str(e)
        )

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "openai_configured": bool(OPENAI_API_KEY),
        "spoonacular_configured": bool(SPOONACULAR_API_KEY)
    }

# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
