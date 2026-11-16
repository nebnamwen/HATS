import cv2
from fpdf import FPDF

TEAMS = {
    "rabbit": 3,
    "squid": 9,
    "crocodile": 46,
    "bat": 47
    }

IDS = {
    "1": 17,
    "2": 42,
    "3": 43,
    "4": 21,
    "home": 10
    }

# Initialize ArUco dictionary
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

for marker_set in TEAMS, IDS:
    for name in marker_set:
        # Generate a marker image as a NumPy array
        img = cv2.aruco.generateImageMarker(aruco_dict, marker_set[name], 300)
        cv2.imwrite(f"images/{name}.png", img)

for team in TEAMS:
    for id_ in IDS: 
        pdf = FPDF(orientation='P', unit='mm', format='Letter')
        pdf.add_page()
        if id_ == "home":
            pdf.image(f"images/{team}.png", x=62, y=30, w=90)
            pdf.image(f"images/{id_}.png", x=62, y=150, w=90)
        else:
            pdf.image(f"images/{team}.png", x=30, y=30, w=60)
            pdf.image(f"images/{team}.png", x=125, y=30, w=60)
            pdf.image(f"images/{id_}.png", x=30, y=125, w=60)
            pdf.image(f"images/{id_}.png", x=125, y=125, w=60)

            pdf.set_line_width(1)
            pdf.set_dash_pattern(16, 8)
            pdf.line(20, 240, 200, 240)

        pdf.output(f"images/{team}_{id_}.pdf")
