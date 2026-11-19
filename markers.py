import json

class marker:
    def __init__(self, data):
        self.id = data["id"]
        self.kind = data["kind"]
        self.name = data["name"]
        self.emoji = data["emoji"]

def _marker_group(kind):
    return { key: item for key, item in markers.items() if item.kind == kind }

with open("static/markers.json", "r", encoding="utf-8") as file:
    _marker_data = json.load(file)

markers = { int(key): marker(_marker_data[key]) for key in _marker_data }

teams = _marker_group("team")
ids = _marker_group("id")
