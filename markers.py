import json

class marker:
    def __init__(self, data):
        self.id = data["id"]
        self.kind = data["kind"]
        self.name = data["name"]
        self.emoji = data["emoji"]
    
with open("markers.json", "r", encoding="utf-8") as file:
    marker_data = json.load(file)

markers = { int(key): marker(marker_data[key]) for key in marker_data }

teams = { key: item for key, item in markers.items() if item.kind == "team" }
ids = { key: item for key, item in markers.items() if item.kind == "id" }
