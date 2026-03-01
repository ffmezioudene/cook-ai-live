from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import httpx
import json
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Keys from environment
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
SPOONACULAR_API_KEY = os.environ.get("SPOONACULAR_API_KEY", "")

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


# === SMALL HELPERS ===

def _extract_json_array(text: str) -> str:
    """
    Extracts the first JSON array from a string.
    Handles code fences and extra text.
    """
    if not text:
        raise ValueError("Empty model response")

    t = text.strip()

    # Strip markdown code fences if present
    if "```" in t:
        # Try ```json ... ```
        m = re.search(r"```json\s*(.*?)\s*```", t, flags=re.DOTALL | re.IGNORECASE)
        if m:
            t = m.group(1).strip()
        else:
            m2 = re.search(r"```\s*(.*?)\s*```", t, flags=re.DOTALL)
            if m2:
                t = m2.group(1).strip()

    # If the whole content is already a JSON array, return it directly.
    if t.startswith("[") and t.endswith("]"):
        return t

    # Otherwise, locate the first JSON array by scanning brackets.
    start = t.find("[")
    if start == -1:
        raise ValueError(f"No JSON array found in response: {t[:200]}")

    depth = 0
    for i in range(start, len(t)):
        if t[i] == "[":
            depth += 1
        elif t[i] == "]":
            depth -= 1
            if depth == 0:
                return t[start : i + 1]

    raise ValueError(f"Unclosed JSON array in response: {t[:200]}")


# === OPENAI VISION ===

async def analyze_image_with_openai(image_base64: str) -> List[DetectedIngredient]:
    """
    Use OpenAI Vision API to detect ingredients in image.
    Expects raw base64 string (no data URL prefix).
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not configured; skipping OpenAI call")
        raise ValueError("OPENAI_API_KEY is missing")

    # IMPORTANT: Provide data URL so OpenAI can read it reliably
    data_url = f"data:image/jpeg;base64,{image_base64}"

    system_prompt = (
        "You are a vision system for food detection.\n"
        "STRICT RULES:\n"
        "- ONLY list food/drink items you can clearly see.\n"
        "- DO NOT guess or infer.\n"
        "- If unsure, omit the item.\n"
        "- Packaged snacks should be labeled generally (e.g. 'Potato chips', 'Mixed nuts').\n"
        "- If the image shows very few items, return fewer items.\n"
        "Return ONLY valid JSON.\n"
    )

    user_prompt = (
        "Analyze this image and return ONLY a JSON array in this exact format:\n"
        "[{\"name\": \"ingredient name\", \"confidence\": 0.0-1.0}]\n"
        "Confidence guidance:\n"
        "- 0.90+ very clear\n"
        "- 0.70-0.89 fairly sure\n"
        "- 0.50-0.69 uncertain (only include if still plausible visually)\n"
        "No extra text. No markdown."
    )

    payload = {
        "model": "gpt-4.1-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "max_tokens": 300,
        "temperature": 0.2,
    }

    try:
        logger.info("Calling OpenAI vision API")
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            logger.info(f"OpenAI HTTP status: {res.status_code}")
            res.raise_for_status()
            data = res.json()

        content = data["choices"][0]["message"]["content"]
        json_text = _extract_json_array(content)
        items = json.loads(json_text)

        ingredients: List[DetectedIngredient] = []
        for item in items:
            name = str(item.get("name", "")).strip()
            conf = float(item.get("confidence", 0.0))
            if not name:
                continue
            # Clamp confidence
            conf = max(0.0, min(1.0, conf))
            ingredients.append(DetectedIngredient(name=name, confidence=conf))

        # limit to avoid UI overload
        return ingredients[:20]

    except httpx.HTTPStatusError as e:
        detail = e.response.text[:300] if e.response is not None else str(e)
        logger.error(f"OpenAI HTTP error: {e} | {detail}")
        raise RuntimeError("OpenAI vision request failed")
    except Exception as e:
        logger.error(f"OpenAI Vision error: {e}")
        raise RuntimeError("Vision analysis failed")


# === SPOONACULAR ===

async def search_recipes_spoonacular(
    ingredients: List[str],
    cuisines: List[str] = [],
    dietary_restrictions: List[str] = [],
    max_results: int = 10,
) -> List[Recipe]:
    if not SPOONACULAR_API_KEY:
        logger.warning("SPOONACULAR_API_KEY not configured, using mock recipes")
        return [
            Recipe(
                id="1",
                title="Simple Snack Plate",
                image=None,
                cuisine="International",
                cooking_time=5,
                difficulty="easy",
                servings=1,
                ingredients=ingredients[:8],
                steps=["Combine what you have and serve."],
                missing_ingredients=[],
            )
        ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            ingredient_query = ",".join(ingredients)

            search_params = {
                "apiKey": SPOONACULAR_API_KEY,
                "ingredients": ingredient_query,
                "number": max_results,
                "ranking": 2,
                "addRecipeInformation": True,
            }

            if cuisines:
                search_params["cuisine"] = ",".join(cuisines)

            if dietary_restrictions:
                search_params["intolerances"] = ",".join(dietary_restrictions)

            response = await http_client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params=search_params,
            )
            response.raise_for_status()
            search_results = response.json()

            recipes: List[Recipe] = []
            for result in search_results[:max_results]:
                try:
                    detail_params = {"apiKey": SPOONACULAR_API_KEY, "includeNutrition": False}
                    detail_response = await http_client.get(
                        f"https://api.spoonacular.com/recipes/{result['id']}/information",
                        params=detail_params,
                    )
                    detail_response.raise_for_status()
                    recipe_detail = detail_response.json()

                    ingredient_list = [
                        ing.get("original", ing.get("name", ""))
                        for ing in recipe_detail.get("extendedIngredients", [])
                    ]

                    steps: List[str] = []
                    for instruction_group in recipe_detail.get("analyzedInstructions", []):
                        for step in instruction_group.get("steps", []):
                            s = step.get("step", "")
                            if s:
                                steps.append(s)

                    if not steps and recipe_detail.get("instructions"):
                        steps = [recipe_detail["instructions"]]

                    missed = [ing.get("name", "") for ing in result.get("missedIngredients", [])]

                    difficulty = "easy"
                    if recipe_detail.get("readyInMinutes", 0) > 45:
                        difficulty = "medium"

                    cuisines_list = recipe_detail.get("cuisines", [])
                    cuisine = cuisines_list[0] if cuisines_list else "International"

                    recipes.append(
                        Recipe(
                            id=str(result["id"]),
                            title=recipe_detail.get("title", "Unknown Recipe"),
                            image=recipe_detail.get("image"),
                            cuisine=cuisine,
                            cooking_time=recipe_detail.get("readyInMinutes", 30),
                            difficulty=difficulty,
                            servings=recipe_detail.get("servings", 4),
                            ingredients=ingredient_list,
                            steps=steps if steps else ["No instructions available"],
                            missing_ingredients=missed,
                        )
                    )
                except Exception as e:
                    logger.error(f"Failed recipe detail for {result.get('id')}: {e}")
                    continue

            return recipes

    except httpx.HTTPStatusError as e:
        logger.error(f"Spoonacular API error: {e.response.status_code} - {e.response.text}")
        if e.response.status_code == 402:
            raise HTTPException(status_code=429, detail="API quota exceeded")
        if e.response.status_code == 401:
            raise HTTPException(status_code=500, detail="Invalid Spoonacular API key")
        raise HTTPException(status_code=500, detail="Recipe search failed")
    except Exception as e:
        logger.error(f"Recipe search error: {e}")
        raise HTTPException(status_code=500, detail="Failed to search recipes")


# === API ENDPOINTS ===

@api_router.get("/")
async def root():
    return {"message": "Smart Cook API", "version": "1.0.0"}

@api_router.post("/scan", response_model=ScanResponse)
async def scan_ingredients(image_data: dict):
    try:
        if "image" not in image_data:
            return ScanResponse(success=False, ingredients=[], error="Missing 'image' field in request")

        image_base64 = image_data["image"]

        # Remove data URL prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        logger.info(f"Analyzing image ({len(image_base64)} chars)")

        ingredients = await analyze_image_with_openai(image_base64)

        logger.info(f"Detected {len(ingredients)} ingredients")
        return ScanResponse(success=True, ingredients=ingredients)

    except HTTPException:
        return ScanResponse(success=False, ingredients=[], error="Request failed")
    except Exception as e:
        logger.error(f"Scan error: {e}")
        return ScanResponse(success=False, ingredients=[], error=str(e))

@api_router.post("/recipes", response_model=RecipesResponse)
async def get_recipes(request: RecipeRequest):
    try:
        if not request.ingredients:
            raise HTTPException(status_code=400, detail="At least one ingredient required")

        logger.info(f"Searching recipes for {len(request.ingredients)} ingredients")
        logger.info(f"Cuisines filter: {request.cuisines}")

        recipes = await search_recipes_spoonacular(
            ingredients=request.ingredients,
            cuisines=request.cuisines or [],
            dietary_restrictions=request.dietary_restrictions or [],
            max_results=request.max_results,
        )

        logger.info(f"Found {len(recipes)} recipes")
        return RecipesResponse(success=True, recipes=recipes)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recipe search error: {e}")
        return RecipesResponse(success=False, recipes=[], error=str(e))

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(OPENAI_API_KEY),
        "spoonacular_configured": bool(SPOONACULAR_API_KEY),
    }

app.include_router(api_router)