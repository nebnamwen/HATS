import sys
import importlib
from flask import Flask, request, send_from_directory

app = Flask(__name__)

@app.route('/lib/<path:filename>')
def lib(filename):
    return send_from_directory('lib', filename)

@app.route('/api/get_session')
def get_session():
    game_token = request.args.get('game_token')
    session_token = request.args.get('session_token')
    return app.game.get_session(game_token, session_token)

def load_game(mode_name, *args):
    module = importlib.import_module(f"game.{mode_name}")
    game_cls = module.game
    return game_cls(*args)

def main():
    mode_name = "base"
    game_args = []

    if len(sys.argv) > 1:
        mode_name, *game_args = sys.argv[1:]

    app.game = load_game(mode_name, *game_args)
    app.run(host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
