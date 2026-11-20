import math

from schemas import GeoJSONPoint


# returns the distance between two [lat,long] points
def get_distance(a: GeoJSONPoint, b: GeoJSONPoint) -> float:
    return math.sqrt(
        math.pow(b.coordinates[0] - a.coordinates[0], 2)
        + math.pow(b.coordinates[1] - a.coordinates[1], 2)
    )
