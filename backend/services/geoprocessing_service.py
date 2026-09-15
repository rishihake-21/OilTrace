import cv2
import numpy as np
import math


def mask_to_polygon(mask, min_area=10):
    """
    Convert a binary oil mask into pixel-coordinate polygons.
    """

    mask = np.asarray(mask).astype(np.uint8)

    # Ensure binary mask
    mask = (mask > 0).astype(np.uint8) * 255

    # Remove small noise
    kernel = np.ones((3, 3), np.uint8)

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        kernel
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        kernel
    )

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    polygons = []

    for contour in contours:

        area = cv2.contourArea(contour)

        if area < min_area:
            continue

        epsilon = 0.002 * cv2.arcLength(
            contour,
            True
        )

        approx = cv2.approxPolyDP(
            contour,
            epsilon,
            True
        )

        coordinates = []

        for point in approx:

            x, y = point[0]

            coordinates.append([
                float(x),
                float(y)
            ])

        if len(coordinates) >= 3:

            polygons.append({
                "area_pixels": float(area),
                "coordinates": coordinates
            })

    return polygons


def pixel_to_geo(
    x,
    y,
    image_width,
    image_height,
    north,
    south,
    east,
    west
):
    """
    Convert pixel coordinates to approximate latitude/longitude.

    Pixel origin:
        (0, 0) = top-left
    """

    longitude = (
        west
        + (x / image_width)
        * (east - west)
    )

    latitude = (
        north
        - (y / image_height)
        * (north - south)
    )

    return [
        float(latitude),
        float(longitude)
    ]


def pixel_polygons_to_geo(
    polygons,
    image_width,
    image_height,
    north,
    south,
    east,
    west
):
    """
    Convert all pixel polygons to geographic coordinates.
    """

    geo_polygons = []

    for polygon in polygons:

        geo_coordinates = []

        for x, y in polygon["coordinates"]:

            lat_lon = pixel_to_geo(
                x,
                y,
                image_width,
                image_height,
                north,
                south,
                east,
                west
            )

            geo_coordinates.append(
                lat_lon
            )

        geo_polygons.append({
            "area_pixels": polygon["area_pixels"],
            "coordinates": geo_coordinates
        })

    return geo_polygons


def calculate_geo_area_km2(
    coordinates
):
    """
    Approximate polygon area in square kilometres.
    Coordinates are [latitude, longitude].
    """

    if len(coordinates) < 3:
        return 0.0

    latitudes = [
        point[0]
        for point in coordinates
    ]

    mean_lat = math.radians(
        sum(latitudes) / len(latitudes)
    )

    meters_per_degree_lat = 111320.0

    meters_per_degree_lon = (
        111320.0
        * math.cos(mean_lat)
    )

    xy = []

    for lat, lon in coordinates:

        x = lon * meters_per_degree_lon
        y = lat * meters_per_degree_lat

        xy.append((x, y))

    area = 0.0

    for i in range(len(xy)):

        x1, y1 = xy[i]

        x2, y2 = xy[
            (i + 1) % len(xy)
        ]

        area += (
            x1 * y2
            - x2 * y1
        )

    area = abs(area) / 2.0

    return area / 1_000_000.0


def haversine_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Calculate distance between two geographic points.
    """

    R = 6371.0

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = math.radians(
        lat2 - lat1
    )

    dlon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


def calculate_geo_perimeter_km(
    coordinates
):
    """
    Calculate polygon perimeter in kilometres.
    """

    if len(coordinates) < 2:
        return 0.0

    perimeter = 0.0

    for i in range(len(coordinates)):

        p1 = coordinates[i]

        p2 = coordinates[
            (i + 1) % len(coordinates)
        ]

        perimeter += haversine_distance_km(
            p1[0],
            p1[1],
            p2[0],
            p2[1]
        )

    return perimeter


def calculate_polygon_center(
    coordinates
):
    """
    Calculate the geographic center of a polygon.
    """

    if not coordinates:
        return None

    latitudes = [
        point[0]
        for point in coordinates
    ]

    longitudes = [
        point[1]
        for point in coordinates
    ]

    return {
        "lat": float(
            sum(latitudes)
            / len(latitudes)
        ),
        "lon": float(
            sum(longitudes)
            / len(longitudes)
        )
    }