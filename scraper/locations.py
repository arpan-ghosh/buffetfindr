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

PHILADELPHIA = [
    # Philadelphia city
    {"name": "Center City",          "lat": 39.9526, "lng": -75.1652},
    {"name": "University City",      "lat": 39.9522, "lng": -75.1932},
    {"name": "Northeast Philadelphia","lat": 40.0629, "lng": -75.0402},
    {"name": "South Philadelphia",   "lat": 39.9234, "lng": -75.1636},
    {"name": "North Philadelphia",   "lat": 39.9920, "lng": -75.1582},
    {"name": "Germantown",           "lat": 40.0431, "lng": -75.1716},
    # Montgomery County suburbs
    {"name": "King of Prussia",      "lat": 40.0914, "lng": -75.3855},
    {"name": "Lansdale",             "lat": 40.2415, "lng": -75.2838},
    {"name": "Plymouth Meeting",     "lat": 40.1084, "lng": -75.2810},
    {"name": "Norristown",           "lat": 40.1215, "lng": -75.3402},
    {"name": "Horsham",              "lat": 40.1773, "lng": -75.1494},
    {"name": "Willow Grove",         "lat": 40.1479, "lng": -75.1157},
    {"name": "Ambler",               "lat": 40.1509, "lng": -75.2196},
    {"name": "Blue Bell",            "lat": 40.1540, "lng": -75.2816},
    {"name": "Montgomeryville",      "lat": 40.2476, "lng": -75.2465},
    # Chester County suburbs
    {"name": "Wayne",                "lat": 40.0426, "lng": -75.3851},
    {"name": "Exton",                "lat": 40.0262, "lng": -75.6207},
    {"name": "Malvern",              "lat": 40.0362, "lng": -75.5132},
    # Delaware County suburbs
    {"name": "Media",                "lat": 39.9184, "lng": -75.3802},
    {"name": "Ardmore",              "lat": 40.0090, "lng": -75.2871},
    {"name": "Upper Darby",          "lat": 39.9618, "lng": -75.2596},
    # Bucks County suburbs
    {"name": "Bensalem",             "lat": 40.1029, "lng": -74.9341},
    {"name": "Langhorne",            "lat": 40.1734, "lng": -74.9227},
    {"name": "Doylestown",           "lat": 40.3101, "lng": -75.1299},
    {"name": "Chalfont",             "lat": 40.2887, "lng": -75.2101},
]

NEW_JERSEY = [
    # Central NJ — Edison/Oak Tree Road corridor (largest Indian hub in US per capita)
    {"name": "Edison",               "lat": 40.5187, "lng": -74.4121},
    {"name": "Iselin",               "lat": 40.5698, "lng": -74.3234},
    {"name": "Woodbridge",           "lat": 40.5573, "lng": -74.2846},
    {"name": "Metuchen",             "lat": 40.5432, "lng": -74.3626},
    {"name": "New Brunswick",        "lat": 40.4774, "lng": -74.4447},
    {"name": "Piscataway",           "lat": 40.4990, "lng": -74.3967},
    {"name": "South Brunswick",      "lat": 40.3768, "lng": -74.5315},
    {"name": "East Brunswick",       "lat": 40.4271, "lng": -74.4182},
    {"name": "North Brunswick",      "lat": 40.4746, "lng": -74.4793},
    {"name": "Sayreville",           "lat": 40.4596, "lng": -74.3599},
    {"name": "Old Bridge",           "lat": 40.4134, "lng": -74.3443},
    {"name": "Monroe Township",      "lat": 40.3287, "lng": -74.4252},
    {"name": "Manalapan",            "lat": 40.2929, "lng": -74.3352},
    {"name": "Plainsboro",           "lat": 40.3326, "lng": -74.5918},
    # Princeton corridor
    {"name": "Princeton",            "lat": 40.3573, "lng": -74.6672},
    {"name": "Lawrence Township",    "lat": 40.2815, "lng": -74.7210},
    {"name": "Robbinsville",         "lat": 40.2165, "lng": -74.6091},
    # Somerset County
    {"name": "Bridgewater",          "lat": 40.5937, "lng": -74.6045},
    {"name": "Warren",               "lat": 40.6879, "lng": -74.4960},
    {"name": "Somerset",             "lat": 40.5004, "lng": -74.4971},
    # Parsippany / Morris County — large Indian IT corridor
    {"name": "Parsippany",           "lat": 40.8579, "lng": -74.4265},
    {"name": "Whippany",             "lat": 40.8240, "lng": -74.4196},
    {"name": "Morristown",           "lat": 40.7968, "lng": -74.4818},
    # North Jersey — Hudson/Bergen counties
    {"name": "Jersey City",          "lat": 40.7178, "lng": -74.0431},
    {"name": "Newark",               "lat": 40.7357, "lng": -74.1724},
    {"name": "Hoboken",              "lat": 40.7440, "lng": -74.0324},
    {"name": "North Bergen",         "lat": 40.7984, "lng": -74.0246},
    {"name": "Secaucus",             "lat": 40.7895, "lng": -74.0560},
    {"name": "Lodi",                 "lat": 40.8823, "lng": -74.0826},
    # South Jersey — Philly suburbs
    {"name": "Cherry Hill",          "lat": 39.9312, "lng": -75.0246},
    {"name": "Mount Laurel",         "lat": 39.9429, "lng": -74.9349},
    {"name": "Voorhees",             "lat": 39.8517, "lng": -75.0077},
    {"name": "Marlton",              "lat": 39.8929, "lng": -74.9243},
]

ILLINOIS = [
    # Chicago Devon Avenue — the main Indian strip
    {"name": "Devon Avenue",         "lat": 41.9983, "lng": -87.7101},
    {"name": "Rogers Park",          "lat": 41.9981, "lng": -87.6868},
    {"name": "Skokie",               "lat": 42.0334, "lng": -87.7334},
    {"name": "Lincolnwood",          "lat": 41.9928, "lng": -87.7317},
    {"name": "Morton Grove",         "lat": 42.0408, "lng": -87.7826},
    # Chicago downtown / North Side
    {"name": "Chicago Loop",         "lat": 41.8781, "lng": -87.6298},
    {"name": "Chicago North Side",   "lat": 41.9484, "lng": -87.6553},
    {"name": "Wicker Park",          "lat": 41.9085, "lng": -87.6788},
    # NW suburbs — heavy Indian tech/IT population
    {"name": "Schaumburg",           "lat": 42.0334, "lng": -88.0834},
    {"name": "Hoffman Estates",      "lat": 42.0603, "lng": -88.1431},
    {"name": "Palatine",             "lat": 42.1103, "lng": -88.0342},
    {"name": "Rolling Meadows",      "lat": 42.0742, "lng": -88.0148},
    {"name": "Hanover Park",         "lat": 41.9981, "lng": -88.1448},
    {"name": "Carol Stream",         "lat": 41.9121, "lng": -88.1348},
    {"name": "Bartlett",             "lat": 41.9956, "lng": -88.1784},
    {"name": "Bloomingdale",         "lat": 41.9532, "lng": -88.0797},
    {"name": "Elk Grove Village",    "lat": 42.0003, "lng": -87.9908},
    {"name": "Des Plaines",          "lat": 42.0334, "lng": -87.8831},
    {"name": "Niles",                "lat": 42.0167, "lng": -87.8123},
    {"name": "Glenview",             "lat": 42.0700, "lng": -87.8265},
    {"name": "Evanston",             "lat": 42.0451, "lng": -87.6877},
    # Western suburbs
    {"name": "Naperville",           "lat": 41.7508, "lng": -88.1535},
    {"name": "Lisle",                "lat": 41.7965, "lng": -88.1314},
    {"name": "Bolingbrook",          "lat": 41.6981, "lng": -88.0684},
    {"name": "Westmont",             "lat": 41.7945, "lng": -87.9742},
    {"name": "Oak Brook",            "lat": 41.8364, "lng": -87.9481},
    {"name": "Lombard",              "lat": 41.8867, "lng": -88.0070},
    {"name": "Addison",              "lat": 41.9315, "lng": -87.9886},
    {"name": "Downers Grove",        "lat": 41.8081, "lng": -88.0109},
    {"name": "Aurora",               "lat": 41.7606, "lng": -88.3201},
    {"name": "Woodridge",            "lat": 41.7495, "lng": -88.0498},
]

WASHINGTON = [
    # Seattle proper
    {"name": "Downtown Seattle",     "lat": 47.6062, "lng": -122.3321},
    {"name": "Capitol Hill",         "lat": 47.6221, "lng": -122.3186},
    {"name": "University District",  "lat": 47.6553, "lng": -122.3035},
    {"name": "Northgate",            "lat": 47.7062, "lng": -122.3251},
    {"name": "Rainier Valley",       "lat": 47.5501, "lng": -122.2873},
    {"name": "Shoreline",            "lat": 47.7543, "lng": -122.3415},
    # Eastside — highest Indian density in WA (Microsoft/Amazon employees)
    {"name": "Bellevue",             "lat": 47.6101, "lng": -122.2015},
    {"name": "Redmond",              "lat": 47.6740, "lng": -122.1215},
    {"name": "Kirkland",             "lat": 47.6815, "lng": -122.2087},
    {"name": "Sammamish",            "lat": 47.6163, "lng": -122.0356},
    {"name": "Issaquah",             "lat": 47.5301, "lng": -122.0326},
    {"name": "Mercer Island",        "lat": 47.5707, "lng": -122.2221},
    {"name": "Factoria",             "lat": 47.5618, "lng": -122.1560},
    {"name": "Crossroads Bellevue",  "lat": 47.6207, "lng": -122.1369},
    # North of Seattle
    {"name": "Bothell",              "lat": 47.7601, "lng": -122.2054},
    {"name": "Woodinville",          "lat": 47.7543, "lng": -122.1638},
    {"name": "Kenmore",              "lat": 47.7568, "lng": -122.2448},
    {"name": "Lynnwood",             "lat": 47.8209, "lng": -122.3151},
    {"name": "Totem Lake",           "lat": 47.7148, "lng": -122.1796},
    # South of Seattle
    {"name": "Renton",               "lat": 47.4829, "lng": -122.2171},
    {"name": "Kent",                 "lat": 47.3809, "lng": -122.2348},
    {"name": "Federal Way",          "lat": 47.3223, "lng": -122.3126},
    {"name": "Tukwila",              "lat": 47.4741, "lng": -122.2606},
    {"name": "Burien",               "lat": 47.4701, "lng": -122.3465},
    {"name": "Covington",            "lat": 47.3590, "lng": -122.1171},
]

# ── Top-10 metro expansion ────────────────────────────────────────────────────
# Few anchor points per metro, chosen at South Asian dining clusters.
# Used with `main.py --top 20` (rank by prominence, detail-fetch only the finalists).

LOS_ANGELES = [
    # Central / Westside
    {"name": "Downtown LA",          "lat": 34.0522, "lng": -118.2437},
    {"name": "Hollywood",            "lat": 34.0928, "lng": -118.3287},
    {"name": "Koreatown",            "lat": 34.0617, "lng": -118.3000},
    {"name": "Santa Monica",         "lat": 34.0195, "lng": -118.4912},
    {"name": "Culver City",          "lat": 34.0211, "lng": -118.3965},
    # San Fernando Valley
    {"name": "Burbank",              "lat": 34.1808, "lng": -118.3090},
    {"name": "Glendale",             "lat": 34.1425, "lng": -118.2551},
    {"name": "Sherman Oaks",         "lat": 34.1508, "lng": -118.4489},
    {"name": "Northridge",           "lat": 34.2283, "lng": -118.5368},
    {"name": "Woodland Hills",       "lat": 34.1684, "lng": -118.6059},
    {"name": "Santa Clarita",        "lat": 34.3917, "lng": -118.5426},
    {"name": "Thousand Oaks",        "lat": 34.1706, "lng": -118.8376},
    # San Gabriel Valley
    {"name": "Pasadena",             "lat": 34.1478, "lng": -118.1445},
    {"name": "Alhambra",             "lat": 34.0953, "lng": -118.1270},
    {"name": "El Monte",             "lat": 34.0686, "lng": -118.0276},
    {"name": "West Covina",          "lat": 34.0686, "lng": -117.9390},
    {"name": "Diamond Bar",          "lat": 34.0286, "lng": -117.8103},
    {"name": "Pomona",               "lat": 34.0551, "lng": -117.7500},
    # South Bay / Southeast LA — Artesia/Cerritos is Little India
    {"name": "Torrance",             "lat": 33.8358, "lng": -118.3406},
    {"name": "Hawthorne / Lawndale", "lat": 33.9164, "lng": -118.3526},
    {"name": "Carson",               "lat": 33.8317, "lng": -118.2820},
    {"name": "Long Beach",           "lat": 33.7701, "lng": -118.1937},
    {"name": "Downey",               "lat": 33.9401, "lng": -118.1332},
    {"name": "Whittier",             "lat": 33.9792, "lng": -118.0328},
    {"name": "Artesia / Cerritos",   "lat": 33.8658, "lng": -118.0831},
    # Orange County
    {"name": "Fullerton",            "lat": 33.8704, "lng": -117.9243},
    {"name": "Anaheim",              "lat": 33.8366, "lng": -117.9143},
    {"name": "Garden Grove",         "lat": 33.7739, "lng": -117.9414},
    {"name": "Huntington Beach",     "lat": 33.6603, "lng": -117.9992},
    {"name": "Irvine",               "lat": 33.6846, "lng": -117.8265},
    {"name": "Mission Viejo",        "lat": 33.6000, "lng": -117.6720},
    # Inland Empire
    {"name": "Chino Hills",          "lat": 33.9898, "lng": -117.7326},
    {"name": "Ontario",              "lat": 34.0633, "lng": -117.6509},
    {"name": "Rancho Cucamonga",     "lat": 34.1064, "lng": -117.5931},
    {"name": "Riverside",            "lat": 33.9533, "lng": -117.3962},
]

DALLAS = [
    # Dallas core + north suburbs (Irving/Plano/Frisco are the Indian hubs)
    {"name": "Dallas",               "lat": 32.7767, "lng": -96.7970},
    {"name": "North Dallas / Addison","lat": 32.9618, "lng": -96.8292},
    {"name": "Irving",               "lat": 32.8140, "lng": -96.9489},
    {"name": "Carrollton",           "lat": 32.9537, "lng": -96.8903},
    {"name": "Coppell",              "lat": 32.9546, "lng": -97.0150},
    {"name": "Richardson",           "lat": 32.9483, "lng": -96.7299},
    {"name": "Garland",              "lat": 32.9126, "lng": -96.6389},
    {"name": "Mesquite",             "lat": 32.7668, "lng": -96.5992},
    {"name": "Plano",                "lat": 33.0198, "lng": -96.6989},
    {"name": "Allen",                "lat": 33.1032, "lng": -96.6706},
    {"name": "Frisco",               "lat": 33.1507, "lng": -96.8236},
    {"name": "McKinney",             "lat": 33.1972, "lng": -96.6398},
    {"name": "Wylie",                "lat": 33.0151, "lng": -96.5389},
    {"name": "Rockwall",             "lat": 32.9312, "lng": -96.4597},
    {"name": "Lewisville",           "lat": 33.0462, "lng": -96.9942},
    {"name": "Flower Mound",         "lat": 33.0146, "lng": -97.0970},
    {"name": "Denton",               "lat": 33.2148, "lng": -97.1331},
    # Mid-cities + Fort Worth
    {"name": "Grand Prairie",        "lat": 32.7460, "lng": -96.9978},
    {"name": "Arlington",            "lat": 32.7357, "lng": -97.1081},
    {"name": "Southlake",            "lat": 32.9412, "lng": -97.1342},
    {"name": "Keller / N. Fort Worth","lat": 32.9343, "lng": -97.2517},
    {"name": "Fort Worth",           "lat": 32.7555, "lng": -97.3308},
    {"name": "Mansfield",            "lat": 32.5632, "lng": -97.1417},
    {"name": "DeSoto / Lancaster",   "lat": 32.5900, "lng": -96.8570},
]

HOUSTON = [
    # Southwest — Hillcroft (Little India), Sugar Land, Katy are the Indian hubs
    {"name": "Hillcroft",                         "lat": 29.7066, "lng": -95.5159},
    {"name": "Bellaire / Medical Center",         "lat": 29.7058, "lng": -95.4588},
    {"name": "Houston",                           "lat": 29.7604, "lng": -95.3698},
    {"name": "Westchase / Energy Corridor",       "lat": 29.7700, "lng": -95.6200},
    {"name": "Spring Branch / Memorial",          "lat": 29.8030, "lng": -95.5160},
    {"name": "Sugar Land",                        "lat": 29.5997, "lng": -95.6349},
    {"name": "Missouri City / Stafford",          "lat": 29.6186, "lng": -95.5377},
    {"name": "Richmond / Rosenberg",              "lat": 29.5822, "lng": -95.7608},
    {"name": "Cinco Ranch",                       "lat": 29.7390, "lng": -95.7580},
    {"name": "Katy",                              "lat": 29.7858, "lng": -95.8244},
    # Northwest + north
    {"name": "Copperfield / Hwy 6 North",         "lat": 29.8850, "lng": -95.6450},
    {"name": "Jersey Village",                    "lat": 29.8877, "lng": -95.5633},
    {"name": "Cypress",                           "lat": 29.9691, "lng": -95.6972},
    {"name": "Tomball",                           "lat": 30.0972, "lng": -95.6161},
    {"name": "Greenspoint / North Houston",       "lat": 29.9400, "lng": -95.4100},
    {"name": "Spring / Klein",                    "lat": 30.0799, "lng": -95.4172},
    {"name": "The Woodlands",                     "lat": 30.1658, "lng": -95.4613},
    {"name": "Conroe",                            "lat": 30.3119, "lng": -95.4561},
    {"name": "Humble / Atascocita",               "lat": 29.9988, "lng": -95.2622},
    # South + east
    {"name": "Pearland",                          "lat": 29.5636, "lng": -95.2860},
    {"name": "Clear Lake / Webster",              "lat": 29.5377, "lng": -95.1183},
    {"name": "Pasadena",                          "lat": 29.6911, "lng": -95.2091},
    {"name": "Baytown",                           "lat": 29.7355, "lng": -94.9774},
]

MIAMI = [
    # Miami-Dade
    {"name": "Miami",                             "lat": 25.7617, "lng": -80.1918},
    {"name": "Miami Beach",                       "lat": 25.7907, "lng": -80.1300},
    {"name": "Coral Gables / South Miami",        "lat": 25.7215, "lng": -80.2684},
    {"name": "Doral",                             "lat": 25.8195, "lng": -80.3553},
    {"name": "Kendall",                           "lat": 25.6793, "lng": -80.3173},
    {"name": "Homestead / Cutler Bay",            "lat": 25.5200, "lng": -80.4000},
    {"name": "Hialeah / Miami Lakes",             "lat": 25.9087, "lng": -80.3087},
    {"name": "North Miami / Aventura",            "lat": 25.9565, "lng": -80.1392},
    # Broward
    {"name": "Hollywood",                         "lat": 26.0112, "lng": -80.1495},
    {"name": "Pembroke Pines / Miramar",          "lat": 26.0078, "lng": -80.2963},
    {"name": "Weston",                            "lat": 26.1004, "lng": -80.3998},
    {"name": "Davie / Plantation",                "lat": 26.0765, "lng": -80.2521},
    {"name": "Fort Lauderdale",                   "lat": 26.1224, "lng": -80.1373},
    {"name": "Sunrise / Lauderhill",              "lat": 26.1669, "lng": -80.2564},
    {"name": "Coral Springs",                     "lat": 26.2712, "lng": -80.2706},
    {"name": "Pompano Beach",                     "lat": 26.2379, "lng": -80.1248},
    # Palm Beach County
    {"name": "Boca Raton",                        "lat": 26.3587, "lng": -80.0831},
    {"name": "West Boca",                         "lat": 26.3600, "lng": -80.2000},
    {"name": "Delray Beach",                      "lat": 26.4615, "lng": -80.0728},
    {"name": "Boynton Beach",                     "lat": 26.5318, "lng": -80.0905},
    {"name": "Wellington / Royal Palm Beach",     "lat": 26.6618, "lng": -80.2684},
    {"name": "West Palm Beach",                   "lat": 26.7153, "lng": -80.0534},
    {"name": "Palm Beach Gardens",                "lat": 26.8234, "lng": -80.1387},
    {"name": "Jupiter",                           "lat": 26.9342, "lng": -80.0942},
]

ATLANTA = [
    # Intown + Decatur / Buford Hwy
    {"name": "Midtown Atlanta",                   "lat": 33.7838, "lng": -84.3830},
    {"name": "Decatur",                           "lat": 33.7748, "lng": -84.2963},
    {"name": "Chamblee / Doraville",              "lat": 33.8921, "lng": -84.2988},
    {"name": "Sandy Springs / Dunwoody",          "lat": 33.9304, "lng": -84.3733},
    {"name": "Tucker / Stone Mountain",           "lat": 33.8545, "lng": -84.2171},
    # Gwinnett + north Fulton + Forsyth — the Indian hubs
    {"name": "Norcross / Peachtree Corners",      "lat": 33.9412, "lng": -84.2135},
    {"name": "Lilburn",                           "lat": 33.8901, "lng": -84.1430},
    {"name": "Lawrenceville",                     "lat": 33.9562, "lng": -83.9880},
    {"name": "Snellville",                        "lat": 33.8573, "lng": -84.0199},
    {"name": "Duluth",                            "lat": 34.0029, "lng": -84.1446},
    {"name": "Suwanee",                           "lat": 34.0515, "lng": -84.0713},
    {"name": "Buford / Sugar Hill",               "lat": 34.1207, "lng": -84.0044},
    {"name": "Alpharetta",                        "lat": 34.0754, "lng": -84.2941},
    {"name": "Roswell",                           "lat": 34.0232, "lng": -84.3616},
    {"name": "South Forsyth",                     "lat": 34.1100, "lng": -84.2200},
    {"name": "Cumming",                           "lat": 34.2073, "lng": -84.1402},
    # Cobb + west
    {"name": "Marietta",                          "lat": 33.9526, "lng": -84.5499},
    {"name": "Smyrna / Vinings",                  "lat": 33.8840, "lng": -84.5144},
    {"name": "Kennesaw",                          "lat": 34.0234, "lng": -84.6155},
    {"name": "Woodstock",                         "lat": 34.1015, "lng": -84.5194},
    {"name": "Douglasville",                      "lat": 33.7515, "lng": -84.7477},
    # South
    {"name": "College Park / Airport",            "lat": 33.6534, "lng": -84.4494},
    {"name": "Morrow / Stockbridge",              "lat": 33.5832, "lng": -84.3394},
    {"name": "Peachtree City / Fayetteville",     "lat": 33.3968, "lng": -84.5958},
]

BAY_AREA = [
    # South Bay / Silicon Valley — largest Indian community in the region
    {"name": "San Jose",             "lat": 37.3382, "lng": -121.8863},
    {"name": "Santa Clara",          "lat": 37.3541, "lng": -121.9552},
    {"name": "Sunnyvale",            "lat": 37.3688, "lng": -122.0363},
    {"name": "Cupertino",            "lat": 37.3230, "lng": -122.0322},
    {"name": "Mountain View",        "lat": 37.3861, "lng": -122.0839},
    {"name": "Milpitas",             "lat": 37.4323, "lng": -121.8996},
    {"name": "Campbell",             "lat": 37.2872, "lng": -121.9500},
    {"name": "Los Gatos",            "lat": 37.2358, "lng": -121.9624},
    {"name": "East San Jose",        "lat": 37.3300, "lng": -121.7900},
    {"name": "South San Jose",       "lat": 37.2500, "lng": -121.8600},
    {"name": "Morgan Hill",          "lat": 37.1305, "lng": -121.6544},
    # Peninsula
    {"name": "Palo Alto",            "lat": 37.4419, "lng": -122.1430},
    {"name": "Redwood City",         "lat": 37.4852, "lng": -122.2364},
    {"name": "San Mateo",            "lat": 37.5630, "lng": -122.3255},
    {"name": "South San Francisco",  "lat": 37.6547, "lng": -122.4077},
    {"name": "Daly City",            "lat": 37.6879, "lng": -122.4702},
    # San Francisco
    {"name": "San Francisco",        "lat": 37.7749, "lng": -122.4194},
    # East Bay — Fremont/Tri-Valley are big Indian hubs
    {"name": "Fremont",              "lat": 37.5485, "lng": -121.9886},
    {"name": "Union City",           "lat": 37.5934, "lng": -122.0439},
    {"name": "Hayward",              "lat": 37.6688, "lng": -122.0808},
    {"name": "San Leandro",          "lat": 37.7249, "lng": -122.1561},
    {"name": "Oakland",              "lat": 37.8044, "lng": -122.2712},
    {"name": "Berkeley",             "lat": 37.8715, "lng": -122.2730},
    {"name": "Richmond",             "lat": 37.9358, "lng": -122.3478},
    {"name": "Dublin",               "lat": 37.7022, "lng": -121.9358},
    {"name": "Pleasanton",           "lat": 37.6624, "lng": -121.8747},
    {"name": "Livermore",            "lat": 37.6819, "lng": -121.7680},
    {"name": "San Ramon",            "lat": 37.7799, "lng": -121.9780},
    {"name": "Walnut Creek",         "lat": 37.9101, "lng": -122.0652},
    {"name": "Concord",              "lat": 37.9780, "lng": -122.0311},
    {"name": "Antioch",              "lat": 38.0049, "lng": -121.8058},
    # North Bay
    {"name": "San Rafael",           "lat": 37.9735, "lng": -122.5311},
    {"name": "Novato",               "lat": 38.1074, "lng": -122.5697},
    {"name": "Vallejo",              "lat": 38.1041, "lng": -122.2566},
]

PHOENIX = [
    {"name": "Phoenix",                           "lat": 33.4484, "lng": -112.0740},
    {"name": "North Phoenix",                     "lat": 33.6400, "lng": -112.0700},
    {"name": "Desert Ridge / North Scottsdale",   "lat": 33.6700, "lng": -111.9200},
    {"name": "Scottsdale",                        "lat": 33.4942, "lng": -111.9261},
    # East Valley — Tempe/Chandler/Gilbert are the Indian hubs
    {"name": "Tempe",                             "lat": 33.4255, "lng": -111.9400},
    {"name": "Ahwatukee",                         "lat": 33.3200, "lng": -111.9900},
    {"name": "Mesa",                              "lat": 33.4152, "lng": -111.8315},
    {"name": "East Mesa",                         "lat": 33.4000, "lng": -111.6800},
    {"name": "Chandler",                          "lat": 33.3062, "lng": -111.8413},
    {"name": "Gilbert",                           "lat": 33.3528, "lng": -111.7890},
    {"name": "Queen Creek",                       "lat": 33.2487, "lng": -111.6343},
    # West Valley
    {"name": "Glendale / Peoria",                 "lat": 33.5387, "lng": -112.1860},
    {"name": "Arrowhead / North Peoria",          "lat": 33.6400, "lng": -112.2300},
    {"name": "Surprise",                          "lat": 33.6292, "lng": -112.3679},
    {"name": "Goodyear / Avondale",               "lat": 33.4353, "lng": -112.3577},
]

COLUMBUS = [
    {"name": "Dublin",                            "lat": 40.0992, "lng": -83.1141},
    {"name": "Westerville",                       "lat": 40.1262, "lng": -82.9291},
    {"name": "Columbus",                          "lat": 39.9612, "lng": -82.9988},
    {"name": "Hilliard",                          "lat": 40.0334, "lng": -83.1582},
    {"name": "Gahanna",                           "lat": 40.0192, "lng": -82.8794},
    {"name": "Grove City",                        "lat": 39.8814, "lng": -83.0930},
    {"name": "Polaris",                           "lat": 40.1856, "lng": -83.0080},
    {"name": "Worthington",                       "lat": 40.0931, "lng": -83.0180},
    {"name": "OSU / Upper Arlington",             "lat": 40.0000, "lng": -83.0300},
    {"name": "New Albany",                        "lat": 40.0812, "lng": -82.8088},
    {"name": "Reynoldsburg / Pickerington",       "lat": 39.9548, "lng": -82.8121},
    {"name": "Canal Winchester / Groveport",      "lat": 39.8500, "lng": -82.8500},
    {"name": "Delaware",                          "lat": 40.2987, "lng": -83.0680},
]

CINCINNATI = [
    {"name": "Cincinnati",                        "lat": 39.1031, "lng": -84.5120},
    {"name": "West Chester",                      "lat": 39.3320, "lng": -84.4108},
    {"name": "Mason",                             "lat": 39.3600, "lng": -84.3099},
    {"name": "Blue Ash",                          "lat": 39.2323, "lng": -84.3783},
    {"name": "Fairfield",                         "lat": 39.3453, "lng": -84.5603},
    {"name": "Milford",                           "lat": 39.1750, "lng": -84.2944},
    {"name": "Springdale / Tri-County",           "lat": 39.2870, "lng": -84.4850},
    {"name": "Western Hills",                     "lat": 39.1500, "lng": -84.6200},
    {"name": "Anderson / Eastgate",               "lat": 39.0900, "lng": -84.2800},
    # Northern Kentucky (state=KY, read from each address)
    {"name": "Florence KY",                       "lat": 38.9989, "lng": -84.6266},
    {"name": "Fort Thomas / Cold Spring KY",      "lat": 39.0200, "lng": -84.4400},
]

CLEVELAND = [
    {"name": "Cleveland",                         "lat": 41.4993, "lng": -81.6944},
    {"name": "Parma",                             "lat": 41.4048, "lng": -81.7229},
    {"name": "Solon",                             "lat": 41.3898, "lng": -81.4412},
    {"name": "Beachwood",                         "lat": 41.4645, "lng": -81.5087},
    {"name": "Strongsville",                      "lat": 41.3145, "lng": -81.8357},
    {"name": "Westlake",                          "lat": 41.4553, "lng": -81.9179},
    {"name": "Mentor",                            "lat": 41.6662, "lng": -81.3396},
    {"name": "Lakewood / Rocky River",            "lat": 41.4820, "lng": -81.7982},
    {"name": "University Circle / Cleveland Heights", "lat": 41.5100, "lng": -81.5800},
    {"name": "Mayfield Heights",                  "lat": 41.5192, "lng": -81.4579},
    {"name": "Independence / Brecksville",        "lat": 41.3400, "lng": -81.6400},
    {"name": "Avon",                              "lat": 41.4517, "lng": -82.0354},
]

# ── Second metro expansion (top-20 samples) ───────────────────────────────────

AUSTIN = [
    {"name": "Austin",                         "lat": 30.2672, "lng": -97.7431},
    {"name": "North Austin / Domain",          "lat": 30.4021, "lng": -97.7253},
    {"name": "Cedar Park",                     "lat": 30.5052, "lng": -97.8203},
    {"name": "Round Rock",                     "lat": 30.5083, "lng": -97.6789},
    {"name": "Pflugerville",                   "lat": 30.4394, "lng": -97.6200},
    {"name": "South Austin",                   "lat": 30.2010, "lng": -97.8000},
]

SAN_ANTONIO = [
    {"name": "San Antonio",                    "lat": 29.4241, "lng": -98.4936},
    {"name": "Medical Center",                 "lat": 29.5080, "lng": -98.5750},
    {"name": "Stone Oak",                      "lat": 29.6300, "lng": -98.4900},
    {"name": "UTSA / Helotes",                 "lat": 29.5830, "lng": -98.6200},
    {"name": "Live Oak / Universal City",      "lat": 29.5650, "lng": -98.3360},
]

SAN_DIEGO = [
    {"name": "Mira Mesa / Miramar",            "lat": 32.9156, "lng": -117.1439},
    {"name": "Kearny Mesa",                    "lat": 32.8300, "lng": -117.1500},
    {"name": "Downtown / Hillcrest",           "lat": 32.7400, "lng": -117.1611},
    {"name": "La Jolla / UTC",                 "lat": 32.8700, "lng": -117.2150},
    {"name": "Rancho Bernardo / Poway",        "lat": 33.0180, "lng": -117.0750},
    {"name": "San Marcos / Vista",             "lat": 33.1400, "lng": -117.2000},
]

SACRAMENTO = [
    {"name": "Sacramento",                     "lat": 38.5816, "lng": -121.4944},
    {"name": "Roseville",                      "lat": 38.7521, "lng": -121.2880},
    {"name": "Folsom",                         "lat": 38.6780, "lng": -121.1761},
    {"name": "Elk Grove",                      "lat": 38.4088, "lng": -121.3716},
    {"name": "Rancho Cordova",                 "lat": 38.5891, "lng": -121.3027},
    {"name": "Davis",                          "lat": 38.5449, "lng": -121.7405},
]

LAS_VEGAS = [
    {"name": "The Strip / Paradise",           "lat": 36.1147, "lng": -115.1728},
    {"name": "Spring Valley",                  "lat": 36.1080, "lng": -115.2450},
    {"name": "Summerlin",                      "lat": 36.1700, "lng": -115.3100},
    {"name": "Henderson",                      "lat": 36.0395, "lng": -114.9817},
    {"name": "North Las Vegas / Centennial",   "lat": 36.2700, "lng": -115.2000},
]

DETROIT = [
    {"name": "Farmington Hills",               "lat": 42.4990, "lng": -83.3677},
    {"name": "Troy",                           "lat": 42.6064, "lng": -83.1498},
    {"name": "Canton",                         "lat": 42.3087, "lng": -83.4822},
    {"name": "Novi",                           "lat": 42.4806, "lng": -83.4755},
    {"name": "Hamtramck / Detroit",            "lat": 42.3928, "lng": -83.0496},
    {"name": "Sterling Heights",               "lat": 42.5803, "lng": -83.0302},
]

MINNEAPOLIS = [
    {"name": "Minneapolis",                    "lat": 44.9778, "lng": -93.2650},
    {"name": "St. Paul",                       "lat": 44.9537, "lng": -93.0900},
    {"name": "Bloomington / Edina",            "lat": 44.8408, "lng": -93.2983},
    {"name": "Eden Prairie",                   "lat": 44.8547, "lng": -93.4708},
    {"name": "Plymouth / Maple Grove",         "lat": 45.0500, "lng": -93.4500},
    {"name": "Eagan",                          "lat": 44.8041, "lng": -93.1669},
]

DENVER = [
    {"name": "Denver",                         "lat": 39.7392, "lng": -104.9903},
    {"name": "Aurora",                         "lat": 39.7000, "lng": -104.8200},
    {"name": "Lakewood",                       "lat": 39.7047, "lng": -105.0814},
    {"name": "Centennial / DTC",               "lat": 39.6000, "lng": -104.8900},
    {"name": "Westminster / Broomfield",       "lat": 39.8800, "lng": -105.0500},
    {"name": "Highlands Ranch / Lone Tree",    "lat": 39.5450, "lng": -104.9300},
]

TAMPA = [
    {"name": "Tampa",                          "lat": 27.9506, "lng": -82.4572},
    {"name": "New Tampa / Wesley Chapel",      "lat": 28.1700, "lng": -82.3600},
    {"name": "Brandon",                        "lat": 27.9378, "lng": -82.2859},
    {"name": "Carrollwood / Citrus Park",      "lat": 28.0600, "lng": -82.5400},
    {"name": "Clearwater / Largo",             "lat": 27.9400, "lng": -82.7600},
    {"name": "St. Petersburg",                 "lat": 27.7676, "lng": -82.6403},
]

ORLANDO = [
    {"name": "Orlando",                        "lat": 28.5383, "lng": -81.3792},
    {"name": "International Drive / Dr. Phillips","lat": 28.4500, "lng": -81.4700},
    {"name": "Kissimmee",                      "lat": 28.3000, "lng": -81.4200},
    {"name": "Lake Mary / Sanford",            "lat": 28.7589, "lng": -81.3178},
    {"name": "Winter Park / UCF",              "lat": 28.6000, "lng": -81.2500},
    {"name": "Winter Garden / Ocoee",          "lat": 28.5600, "lng": -81.5700},
]

CHARLOTTE = [
    {"name": "Uptown Charlotte",               "lat": 35.2271, "lng": -80.8431},
    {"name": "Ballantyne / Pineville",         "lat": 35.0600, "lng": -80.8500},
    {"name": "University City",                "lat": 35.3100, "lng": -80.7500},
    {"name": "Matthews",                       "lat": 35.1168, "lng": -80.7237},
    {"name": "Concord",                        "lat": 35.4000, "lng": -80.6000},
    {"name": "Huntersville",                   "lat": 35.4107, "lng": -80.8428},
]

RALEIGH = [
    {"name": "Raleigh",                        "lat": 35.7796, "lng": -78.6382},
    {"name": "Cary",                           "lat": 35.7915, "lng": -78.7811},
    {"name": "Morrisville / RTP",              "lat": 35.8235, "lng": -78.8256},
    {"name": "Durham",                         "lat": 35.9940, "lng": -78.8986},
    {"name": "Chapel Hill",                    "lat": 35.9132, "lng": -79.0558},
    {"name": "Apex / Holly Springs",           "lat": 35.7000, "lng": -78.8500},
]

STATE_MAP = {
    "maryland":      {"locations": MARYLAND,      "abbr": "MD"},
    "virginia":      {"locations": VIRGINIA,      "abbr": "VA"},
    "dc":            {"locations": DC,            "abbr": "DC"},
    "massachusetts": {"locations": MASSACHUSETTS, "abbr": "MA"},
    "new_york":      {"locations": NEW_YORK,      "abbr": "NY"},
    "philadelphia":  {"locations": PHILADELPHIA,  "abbr": "PA"},
    "new_jersey":    {"locations": NEW_JERSEY,    "abbr": "NJ"},
    "illinois":      {"locations": ILLINOIS,      "abbr": "IL"},
    "washington":    {"locations": WASHINGTON,    "abbr": "WA"},
    "los_angeles":   {"locations": LOS_ANGELES,   "abbr": "CA"},
    "dallas":        {"locations": DALLAS,        "abbr": "TX"},
    "houston":       {"locations": HOUSTON,       "abbr": "TX"},
    "miami":         {"locations": MIAMI,         "abbr": "FL"},
    "atlanta":       {"locations": ATLANTA,       "abbr": "GA"},
    "bay_area":      {"locations": BAY_AREA,      "abbr": "CA"},
    "phoenix":       {"locations": PHOENIX,       "abbr": "AZ"},
    "columbus":      {"locations": COLUMBUS,      "abbr": "OH"},
    "cincinnati":    {"locations": CINCINNATI,    "abbr": "OH", "state_from_address": True},
    "cleveland":     {"locations": CLEVELAND,     "abbr": "OH"},
    "austin":        {"locations": AUSTIN,        "abbr": "TX"},
    "san_antonio":   {"locations": SAN_ANTONIO,   "abbr": "TX"},
    "san_diego":     {"locations": SAN_DIEGO,     "abbr": "CA"},
    "sacramento":    {"locations": SACRAMENTO,    "abbr": "CA"},
    "las_vegas":     {"locations": LAS_VEGAS,     "abbr": "NV"},
    "detroit":       {"locations": DETROIT,       "abbr": "MI"},
    "minneapolis":   {"locations": MINNEAPOLIS,   "abbr": "MN"},
    "denver":        {"locations": DENVER,        "abbr": "CO"},
    "tampa":         {"locations": TAMPA,         "abbr": "FL"},
    "orlando":       {"locations": ORLANDO,       "abbr": "FL"},
    "charlotte":     {"locations": CHARLOTTE,     "abbr": "NC"},
    "raleigh":       {"locations": RALEIGH,       "abbr": "NC"},
}
