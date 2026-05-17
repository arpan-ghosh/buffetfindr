"""
Search coordinate grids for each state.
Each location = center of a ~12km radius search circle.
Overlapping circles ensure no gaps in coverage.
"""

MARYLAND = [
    # Montgomery County — highest Indian restaurant density in MD
    {"name": "Rockville",        "lat": 39.0840, "lng": -77.1528},
    {"name": "North Bethesda",   "lat": 39.0468, "lng": -77.1175},
    {"name": "Gaithersburg",     "lat": 39.1434, "lng": -77.2014},
    {"name": "Germantown",       "lat": 39.1732, "lng": -77.2717},
    {"name": "Clarksburg",       "lat": 39.2287, "lng": -77.2628},
    {"name": "Bethesda",         "lat": 38.9807, "lng": -77.1005},
    {"name": "Silver Spring",    "lat": 38.9907, "lng": -77.0261},
    {"name": "Wheaton",          "lat": 39.0418, "lng": -77.0572},
    {"name": "Potomac",          "lat": 39.0218, "lng": -77.2089},
    {"name": "Olney",            "lat": 39.1532, "lng": -77.0697},
    {"name": "Takoma Park",      "lat": 38.9776, "lng": -77.0069},
    # Prince George's County
    {"name": "Langley Park",     "lat": 38.9890, "lng": -76.9808},
    {"name": "College Park",     "lat": 38.9807, "lng": -76.9369},
    {"name": "Hyattsville",      "lat": 38.9556, "lng": -76.9455},
    {"name": "Greenbelt",        "lat": 38.9954, "lng": -76.8753},
    {"name": "Bowie",            "lat": 38.9426, "lng": -76.7291},
    {"name": "Laurel",           "lat": 39.0993, "lng": -76.8483},
    {"name": "New Carrollton",   "lat": 38.9754, "lng": -76.8719},
    {"name": "Adelphi",          "lat": 38.9987, "lng": -76.9702},
    {"name": "Lanham",           "lat": 38.9640, "lng": -76.8583},
    {"name": "Upper Marlboro",   "lat": 38.8212, "lng": -76.7497},
    {"name": "Waldorf",          "lat": 38.6290, "lng": -76.9197},
    # Howard County
    {"name": "Columbia",         "lat": 39.2037, "lng": -76.8610},
    {"name": "Ellicott City",    "lat": 39.2673, "lng": -76.7986},
    {"name": "Fulton",           "lat": 39.1751, "lng": -76.9208},
    # Baltimore City & County
    {"name": "Baltimore",        "lat": 39.2904, "lng": -76.6122},
    {"name": "Towson",           "lat": 39.4015, "lng": -76.6019},
    {"name": "Pikesville",       "lat": 39.3773, "lng": -76.7197},
    {"name": "Owings Mills",     "lat": 39.4215, "lng": -76.7802},
    {"name": "Catonsville",      "lat": 39.2723, "lng": -76.7322},
    {"name": "Essex",            "lat": 39.3076, "lng": -76.4752},
    {"name": "Reisterstown",     "lat": 39.4668, "lng": -76.8283},
    # Frederick County
    {"name": "Frederick",        "lat": 39.4143, "lng": -77.4105},
    # Anne Arundel County
    {"name": "Annapolis",        "lat": 38.9784, "lng": -76.4922},
    {"name": "Glen Burnie",      "lat": 39.1626, "lng": -76.6274},
    {"name": "Odenton",          "lat": 39.0629, "lng": -76.6983},
]

VIRGINIA = [
    # Northern Virginia — very high Indian density
    {"name": "Fairfax",          "lat": 38.8462, "lng": -77.3064},
    {"name": "Centreville",      "lat": 38.8401, "lng": -77.4294},
    {"name": "Chantilly",        "lat": 38.8951, "lng": -77.4314},
    {"name": "Reston",           "lat": 38.9586, "lng": -77.3570},
    {"name": "Herndon",          "lat": 38.9696, "lng": -77.3861},
    {"name": "Sterling",         "lat": 39.0026, "lng": -77.4219},
    {"name": "Ashburn",          "lat": 39.0437, "lng": -77.4875},
    {"name": "Leesburg",         "lat": 39.1157, "lng": -77.5636},
    {"name": "McLean",           "lat": 38.9343, "lng": -77.1772},
    {"name": "Vienna",           "lat": 38.9012, "lng": -77.2652},
    {"name": "Springfield",      "lat": 38.7893, "lng": -77.1872},
    {"name": "Alexandria",       "lat": 38.8048, "lng": -77.0469},
    {"name": "Arlington",        "lat": 38.8799, "lng": -77.1068},
    {"name": "Falls Church",     "lat": 38.8823, "lng": -77.1711},
    {"name": "Annandale",        "lat": 38.8307, "lng": -77.2072},
    {"name": "Burke",            "lat": 38.7884, "lng": -77.2716},
    {"name": "Manassas",         "lat": 38.7509, "lng": -77.4753},
    {"name": "Woodbridge",       "lat": 38.6584, "lng": -77.2496},
    {"name": "Tysons",           "lat": 38.9187, "lng": -77.2311},
    {"name": "Lorton",           "lat": 38.7012, "lng": -77.2197},
    # Richmond area
    {"name": "Richmond",         "lat": 37.5407, "lng": -77.4360},
    {"name": "Henrico",          "lat": 37.5510, "lng": -77.3200},
    {"name": "Chesterfield",     "lat": 37.3779, "lng": -77.5079},
    # Hampton Roads
    {"name": "Virginia Beach",   "lat": 36.8529, "lng": -75.9780},
    {"name": "Norfolk",          "lat": 36.8508, "lng": -76.2859},
    {"name": "Chesapeake",       "lat": 36.7682, "lng": -76.2875},
    # Other VA cities
    {"name": "Fredericksburg",   "lat": 38.3032, "lng": -77.4605},
]

DC = [
    {"name": "DC Northwest",     "lat": 38.9172, "lng": -77.0378},
    {"name": "DC Northeast",     "lat": 38.9101, "lng": -76.9896},
    {"name": "DC Southeast",     "lat": 38.8673, "lng": -76.9757},
    {"name": "DC Southwest",     "lat": 38.8767, "lng": -77.0214},
    {"name": "Capitol Hill",     "lat": 38.8899, "lng": -76.9965},
    {"name": "Adams Morgan",     "lat": 38.9219, "lng": -77.0424},
    {"name": "U Street",         "lat": 38.9172, "lng": -77.0282},
]

MASSACHUSETTS = [
    # Boston proper
    {"name": "Downtown Boston",    "lat": 42.3601, "lng": -71.0589},
    {"name": "Allston",            "lat": 42.3538, "lng": -71.1314},
    {"name": "Jamaica Plain",      "lat": 42.3100, "lng": -71.1133},
    {"name": "Dorchester",         "lat": 42.3017, "lng": -71.0665},
    # Inner suburbs
    {"name": "Cambridge",          "lat": 42.3736, "lng": -71.1097},
    {"name": "Somerville",         "lat": 42.3876, "lng": -71.0995},
    {"name": "Brookline",          "lat": 42.3318, "lng": -71.1212},
    {"name": "Newton",             "lat": 42.3370, "lng": -71.2092},
    {"name": "Quincy",             "lat": 42.2529, "lng": -71.0023},
    {"name": "Watertown",          "lat": 42.3668, "lng": -71.1828},
    {"name": "Medford",            "lat": 42.4184, "lng": -71.1062},
    {"name": "Malden",             "lat": 42.4251, "lng": -71.0662},
    {"name": "Waltham",            "lat": 42.3765, "lng": -71.2356},
    {"name": "Lexington",          "lat": 42.4473, "lng": -71.2245},
    {"name": "Burlington",         "lat": 42.5048, "lng": -71.1956},
    {"name": "Woburn",             "lat": 42.4793, "lng": -71.1523},
    # Framingham corridor — large Indian community
    {"name": "Framingham",         "lat": 42.2793, "lng": -71.4162},
    {"name": "Natick",             "lat": 42.2848, "lng": -71.3495},
    {"name": "Marlborough",        "lat": 42.3487, "lng": -71.5523},
    {"name": "Westborough",        "lat": 42.2698, "lng": -71.6134},
    {"name": "Northborough",       "lat": 42.3195, "lng": -71.6440},
    # North of Boston
    {"name": "Lowell",             "lat": 42.6334, "lng": -71.3162},
    {"name": "Chelmsford",         "lat": 42.5995, "lng": -71.3673},
    {"name": "Andover",            "lat": 42.6584, "lng": -71.1370},
    # South Shore
    {"name": "Brockton",           "lat": 42.0834, "lng": -71.0184},
    {"name": "Canton",             "lat": 42.1584, "lng": -71.1456},
]

NEW_YORK = [
    # Manhattan — concentrated search for Indian restaurant corridors
    {"name": "Curry Hill (28th St)", "lat": 40.7443, "lng": -73.9888},  # main Indian strip
    {"name": "Midtown East",         "lat": 40.7549, "lng": -73.9840},
    {"name": "East Village",         "lat": 40.7264, "lng": -73.9818},
    {"name": "Upper West Side",      "lat": 40.7870, "lng": -73.9754},
    {"name": "Harlem",               "lat": 40.8116, "lng": -73.9465},
    {"name": "Lower Manhattan",      "lat": 40.7128, "lng": -74.0060},
    # Queens — Indian food capital of NYC
    {"name": "Jackson Heights",      "lat": 40.7557, "lng": -73.8831},  # THE Indian hub
    {"name": "Flushing",             "lat": 40.7675, "lng": -73.8330},
    {"name": "Jamaica",              "lat": 40.6943, "lng": -73.8062},
    {"name": "Woodside",             "lat": 40.7448, "lng": -73.9022},
    {"name": "Forest Hills",         "lat": 40.7189, "lng": -73.8448},
    {"name": "Richmond Hill",        "lat": 40.6970, "lng": -73.8310},  # Indo-Caribbean hub
    {"name": "Briarwood",            "lat": 40.7084, "lng": -73.8202},
    {"name": "Astoria",              "lat": 40.7721, "lng": -73.9301},
    {"name": "Corona",               "lat": 40.7501, "lng": -73.8628},
    # Brooklyn
    {"name": "Downtown Brooklyn",    "lat": 40.6928, "lng": -73.9903},
    {"name": "Flatbush",             "lat": 40.6388, "lng": -73.9558},
    {"name": "Canarsie",             "lat": 40.6389, "lng": -73.9025},
    {"name": "Bay Ridge",            "lat": 40.6353, "lng": -74.0200},
    # Bronx
    {"name": "South Bronx",          "lat": 40.8174, "lng": -73.9190},
    {"name": "Fordham",              "lat": 40.8612, "lng": -73.8938},
    # Staten Island
    {"name": "Staten Island",        "lat": 40.5795, "lng": -74.1502},
    # Long Island (close suburbs)
    {"name": "Hicksville",           "lat": 40.7685, "lng": -73.5257},  # large Indian community
    {"name": "Westbury",             "lat": 40.7554, "lng": -73.5876},
    {"name": "Garden City",          "lat": 40.7268, "lng": -73.6343},
    # NJ across the river
    {"name": "Jersey City",          "lat": 40.7178, "lng": -74.0431},
    {"name": "Newark",               "lat": 40.7357, "lng": -74.1724},
    {"name": "Edison",               "lat": 40.5187, "lng": -74.4121},  # biggest Indian hub in NJ
    {"name": "Woodbridge",           "lat": 40.5573, "lng": -74.2846},
    {"name": "Parsippany",           "lat": 40.8579, "lng": -74.4265},
]

STATE_MAP = {
    "maryland":      {"locations": MARYLAND,      "abbr": "MD"},
    "virginia":      {"locations": VIRGINIA,      "abbr": "VA"},
    "dc":            {"locations": DC,            "abbr": "DC"},
    "massachusetts": {"locations": MASSACHUSETTS, "abbr": "MA"},
    "new_york":      {"locations": NEW_YORK,       "abbr": "NY"},
}
