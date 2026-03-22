from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
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
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    meal_type: Optional[str] = None
    max_time: Optional[int] = None
    max_results: int = Field(default=10, ge=1, le=100)

class RecipeIngredient(BaseModel):
    name: str
    amount: Optional[str] = None

class Recipe(BaseModel):
    id: str
    title: str
    image: Optional[str] = None
    cuisine: str
    cuisines: Optional[List[str]] = []
    cooking_time: int
    difficulty: str
    servings: int
    ingredients: List[str]
    steps: List[str]
    missing_ingredients: Optional[List[str]] = []
    dish_types: Optional[List[str]] = []
    meal_type: Optional[str] = None

class RecipesResponse(BaseModel):
    success: bool
    recipes: List[Recipe] = []
    error: Optional[str] = None

# === SPOONACULAR DOCS HELPERS ===
# Source: https://spoonacular.com/food-api/docs#Cuisines
SPOONACULAR_CUISINES = {
    "african",
    "asian",
    "american",
    "british",
    "cajun",
    "caribbean",
    "chinese",
    "eastern european",
    "european",
    "french",
    "german",
    "greek",
    "indian",
    "irish",
    "italian",
    "japanese",
    "jewish",
    "korean",
    "latin american",
    "mediterranean",
    "mexican",
    "middle eastern",
    "nordic",
    "southern",
    "spanish",
    "thai",
    "vietnamese",
}

# Source: https://spoonacular.com/food-api/docs (Meal Types)
SPOONACULAR_MEAL_TYPES = {
    "main course",
    "side dish",
    "dessert",
    "appetizer",
    "salad",
    "bread",
    "breakfast",
    "soup",
    "beverage",
    "sauce",
    "marinade",
    "fingerfood",
    "snack",
    "drink",
}

def _normalize_label(value: str) -> str:
    return value.strip().lower().replace("_", " ").replace("-", " ")

def _normalize_cuisines(values: List[str]) -> List[str]:
    normalized = []
    for value in values:
        if not value:
            continue
        canon = _normalize_label(value)
        if canon in SPOONACULAR_CUISINES:
            normalized.append(canon)
    return list(dict.fromkeys(normalized))

def _normalize_meal_type(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    canon = _normalize_label(value)
    if canon in SPOONACULAR_MEAL_TYPES:
        return canon
    return None

def _infer_meal_type_from_dish_types(dish_types: List[str]) -> Optional[str]:
    normalized = {_normalize_label(t) for t in dish_types if t}
    if "breakfast" in normalized or "brunch" in normalized:
        return "breakfast"
    if "dessert" in normalized:
        return "dessert"
    if "snack" in normalized or "fingerfood" in normalized:
        return "snack"
    if "main course" in normalized or "main dish" in normalized:
        return "main course"
    return None

def _matches_meal_type(dish_types: List[str], meal_type: str) -> bool:
    normalized = {_normalize_label(t) for t in dish_types if t}
    if meal_type == "breakfast":
        return "breakfast" in normalized or "brunch" in normalized
    if meal_type == "main course":
        return "main course" in normalized or "main dish" in normalized
    if meal_type == "dessert":
        return "dessert" in normalized
    if meal_type == "snack":
        return "snack" in normalized or "fingerfood" in normalized
    return meal_type in normalized

# === HELPER FUNCTIONS ===

async def analyze_image_with_openai(image_base64: str) -> List[DetectedIngredient]:
    """
    Use OpenAI Vision API to detect ingredients in image
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not configured; skipping vision analysis")
        return []

    def _extract_json_array(text: str) -> Optional[list]:
        cleaned = text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()

        match = re.search(r"\[[\s\S]*\]", cleaned)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None

    try:
        logger.info("Calling OpenAI Vision for ingredient detection")
        data_url = f"data:image/jpeg;base64,{image_base64}"

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an expert at identifying food items and ingredients. "
                        "Only list visible items. If few items are visible, return few."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analyze this fridge/food image and detect all visible food items and ingredients.\n"
                                "Return ONLY a JSON array with this exact format:\n"
                                '[{"name": "ingredient name", "confidence": 0.95}]\n'
                                "Rules:\n"
                                "- confidence between 0.0 and 1.0\n"
                                "- Only include actual food items/ingredients you can see\n"
                                "- Be specific (e.g., 'Cherry Tomatoes' not just 'Tomatoes')"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                },
            ],
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            logger.info(f"OpenAI status: {response.status_code}")
            response.raise_for_status()
            data = response.json()

        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        ingredients_data = _extract_json_array(content) or []
        ingredients = [DetectedIngredient(**item) for item in ingredients_data if isinstance(item, dict)]
        return ingredients[:15]

    except Exception as e:
        logger.error(f"OpenAI Vision error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")


async def _rerank_with_openai(recipes: List[Recipe], ingredients: List[str]) -> Optional[List[str]]:
    if not OPENAI_API_KEY or not recipes:
        return None

    try:
        payload = [
            {
                "id": r.id,
                "title": r.title,
                "cuisine": r.cuisine,
                "cooking_time": r.cooking_time,
                "ingredients": r.ingredients[:10],
            }
            for r in recipes
        ]

        system_prompt = "Rank recipes by ingredient overlap and usefulness. Return JSON only."
        user_prompt = (
            'Return JSON: {"recipe_ids": ["id1","id2", "..."]}. '
            "Rank by most ingredient overlap, then shorter cook time."
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4.1-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                        {"role": "user", "content": json.dumps({"ingredients": ingredients, "recipes": payload})},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 400,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)
            recipe_ids = result.get("recipe_ids")
            if isinstance(recipe_ids, list) and recipe_ids:
                return [str(rid) for rid in recipe_ids]
    except Exception as e:
        logger.warning(f"OpenAI rerank failed: {e}")
        return None

    return None

async def search_recipes_spoonacular(
    ingredients: List[str],
    cuisines: List[str] = [],
    dietary_restrictions: List[str] = [],
    meal_type: Optional[str] = None,
    max_time: Optional[int] = None,
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
            # Step 1: Search by ingredients (get a larger candidate pool)
            ingredient_query = ",".join(ingredients)
            candidate_count = min(max_results * 4, 100)
            search_params = {
                "apiKey": SPOONACULAR_API_KEY,
                "ingredients": ingredient_query,
                "number": candidate_count,
                "ranking": 2,  # Minimize missing ingredients
            }

            # Add dietary restrictions if provided (findByIngredients supports intolerances)
            if dietary_restrictions:
                search_params["intolerances"] = ",".join(dietary_restrictions)

            response = await http_client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params=search_params
            )
            response.raise_for_status()
            search_results = response.json()

            normalized_cuisines = _normalize_cuisines(cuisines)
            normalized_meal_type = _normalize_meal_type(meal_type)

            recipes = []
            for result in search_results:
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
                    
                    # Get cuisine + dish types
                    cuisines_list = recipe_detail.get('cuisines', [])
                    dish_types = recipe_detail.get('dishTypes', [])
                    cuisine = cuisines_list[0] if cuisines_list else "International"

                    # Apply filters based on Spoonacular docs
                    if max_time is not None:
                        ready_minutes = recipe_detail.get('readyInMinutes', 0)
                        if ready_minutes and ready_minutes > max_time:
                            continue

                    if normalized_cuisines:
                        recipe_cuisines = _normalize_cuisines(cuisines_list)
                        if not any(c in recipe_cuisines for c in normalized_cuisines):
                            continue

                    if normalized_meal_type:
                        if not _matches_meal_type(dish_types, normalized_meal_type):
                            continue

                    inferred_meal_type = _infer_meal_type_from_dish_types(dish_types)
                    
                    recipes.append(Recipe(
                        id=str(result['id']),
                        title=recipe_detail.get('title', 'Unknown Recipe'),
                        image=recipe_detail.get('image'),
                        cuisine=cuisine,
                        cuisines=cuisines_list,
                        cooking_time=recipe_detail.get('readyInMinutes', 30),
                        difficulty=difficulty,
                        servings=recipe_detail.get('servings', 4),
                        ingredients=ingredient_list,
                        steps=steps if steps else ["No instructions available"],
                        missing_ingredients=missed,
                        dish_types=dish_types,
                        meal_type=inferred_meal_type
                    ))
                
                except Exception as e:
                    logger.error(f"Failed to get recipe details for ID {result.get('id')}: {str(e)}")
                    continue
            
            return recipes[:max_results]
    
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
        logger.info(f"Meal type filter: {request.meal_type}, Max time: {request.max_time}")
        
        # Search recipes
        recipes = await search_recipes_spoonacular(
            ingredients=request.ingredients,
            cuisines=request.cuisines,
            dietary_restrictions=request.dietary_restrictions,
            meal_type=request.meal_type,
            max_time=request.max_time,
            max_results=request.max_results
        )

        # Optional OpenAI re-rank (safe fallback if it fails or returns empty)
        reranked_ids = await _rerank_with_openai(recipes, request.ingredients)
        if reranked_ids:
            recipe_map = {r.id: r for r in recipes}
            reranked = [recipe_map[rid] for rid in reranked_ids if rid in recipe_map]
            if reranked:
                recipes = reranked
        
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

