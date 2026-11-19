import cv2
from fpdf import FPDF

from markers import *

png_d = "static/images/png"
pdf_d = "static/images/pdf"

def png_f(marker):
    return f"{png_d}/{marker.name}.png"

def pdf_f(team, id_):
    return f"{pdf_d}/{team.name}_{id_.name}.pdf"

# Initialize ArUco dictionary
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

for key, marker in markers.items():
    # Generate a marker image as a NumPy array
    img = cv2.aruco.generateImageMarker(aruco_dict, marker.id, 300)
    cv2.imwrite(png_f(marker), img)

for team in teams.values():
    for id_ in ids.values(): 
        pdf = FPDF(orientation='P', unit='mm', format='Letter')
        pdf.add_page()
        if id_.name == "home":
            pdf.image(png_f(team), x=62, y=30, w=90)
            pdf.image(png_f(id_), x=62, y=150, w=90)
        else:
            pdf.image(png_f(team), x=30, y=30, w=60)
            pdf.image(png_f(team), x=125, y=30, w=60)
            pdf.image(png_f(id_), x=30, y=125, w=60)
            pdf.image(png_f(id_), x=125, y=125, w=60)

            pdf.set_line_width(1)
            pdf.set_dash_pattern(16, 8)
            pdf.line(20, 240, 200, 240)

        pdf.output(pdf_f(team, id_))
