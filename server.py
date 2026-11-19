import sys
import importlib
from flask import Flask, request, send_from_directory

app = Flask(__name__)

@app.route('/node_modules/<path:filename>')
def node_modules(filename):
    return send_from_directory('node_modules', filename)

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
    app.run()

if __name__ == "__main__":
    main()
