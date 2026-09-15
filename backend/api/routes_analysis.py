from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
)

import cv2
import numpy as np

from backend.services.segmentation_service import (
    get_segmentation_service,
)

from backend.services.geoprocessing_service import (
    mask_to_polygon,
    pixel_polygons_to_geo,
    calculate_geo_area_km2,
    calculate_geo_perimeter_km,
    calculate_polygon_center,
)


router = APIRouter(
    prefix="/api",
    tags=["Analysis"],
)


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "OSDVAS backend",
    }


# =========================================================
# ANALYZE SAR IMAGE
# =========================================================

@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),

    north: float = Form(...),
    south: float = Form(...),
    east: float = Form(...),
    west: float = Form(...),
):
    """
    Analyze an uploaded SAR image.

    Pipeline:

        SAR Image
            ↓
        DeepLabV3+
            ↓
        5-Class Segmentation
            ↓
        Oil Spill Mask
            ↓
        Polygon Extraction
            ↓
        Pixel → Geographic Coordinates
            ↓
        Area / Perimeter / Center
            ↓
        JSON Response

    Classes:

        0 = Sea Surface
        1 = Oil Spill
        2 = Look-alike
        3 = Ship
        4 = Land
    """

    try:

        # =================================================
        # 1. Validate footprint
        # =================================================

        if north <= south:
            raise HTTPException(
                status_code=400,
                detail="North must be greater than South.",
            )

        if east <= west:
            raise HTTPException(
                status_code=400,
                detail="East must be greater than West.",
            )

        # =================================================
        # 2. Validate upload
        # =================================================

        if file is None:
            raise HTTPException(
                status_code=400,
                detail="No file uploaded.",
            )

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file has no filename.",
            )

        # =================================================
        # 3. Read file
        # =================================================

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )

        # =================================================
        # 4. Convert bytes → NumPy
        # =================================================

        image_array = np.frombuffer(
            contents,
            dtype=np.uint8,
        )

        # =================================================
        # 5. Decode image
        # =================================================

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not decode image. "
                    "Please upload a valid JPG or PNG."
                ),
            )

        # =================================================
        # 6. Run DeepLabV3+ segmentation
        # =================================================

        service = get_segmentation_service()

        result = service.predict(image)

        width = result["width"]
        height = result["height"]

        # =================================================
        # 7. Oil mask → pixel polygons
        # =================================================

        pixel_polygons = mask_to_polygon(
            result["oil_mask"],
            min_area=10,
        )

        # =================================================
        # 8. Pixel polygons → geographic polygons
        # =================================================

        geo_polygons = pixel_polygons_to_geo(
            pixel_polygons,

            image_width=width,
            image_height=height,

            north=north,
            south=south,
            east=east,
            west=west,
        )

        # =================================================
        # 9. Calculate geographic metrics
        # =================================================

        polygon_results = []

        total_area = 0.0
        total_perimeter = 0.0

        largest_polygon = None

        for polygon in geo_polygons:

            coordinates = polygon["coordinates"]

            area_km2 = calculate_geo_area_km2(
                coordinates
            )

            perimeter_km = calculate_geo_perimeter_km(
                coordinates
            )

            center = calculate_polygon_center(
                coordinates
            )

            polygon_result = {
                "coordinates": coordinates,

                "area_km2": round(
                    area_km2,
                    6,
                ),

                "perimeter_km": round(
                    perimeter_km,
                    6,
                ),

                "center": center,
            }

            polygon_results.append(
                polygon_result
            )

            total_area += area_km2
            total_perimeter += perimeter_km

            if (
                largest_polygon is None
                or area_km2
                > largest_polygon["area_km2"]
            ):
                largest_polygon = polygon_result

        # =================================================
        # 10. Determine spill center
        # =================================================

        spill_center = None

        if largest_polygon is not None:
            spill_center = largest_polygon["center"]

        # =================================================
        # 11. Response
        # =================================================

        return {

            "success": True,

            "filename": file.filename,

            "image": {
                "width": width,
                "height": height,
            },

            "footprint": {
                "north": north,
                "south": south,
                "east": east,
                "west": west,
            },

            "segmentation": {

                "classes": result[
                    "class_counts"
                ],

                "oil_pixels": result[
                    "oil_pixels"
                ],

                "oil_percentage": round(
                    result[
                        "oil_percentage"
                    ],
                    4,
                ),
            },

            "spill": {

                "detected":
                    result["oil_pixels"] > 0,

                "polygon_count":
                    len(polygon_results),

                "center":
                    spill_center,

                "area_km2":
                    round(
                        total_area,
                        6,
                    ),

                "perimeter_km":
                    round(
                        total_perimeter,
                        6,
                    ),

                "polygons":
                    polygon_results,
            },
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"Analysis error: "
            f"{type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        )