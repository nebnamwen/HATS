import threading
import secrets

from markers import *

class player:
    def __init__(self,game,session,team,id_):
        self.game = game
        self.session = session
        self.team = team
        self.id = id_

    def get_id(self):
        return { "team": self.team, "id": self.id }

class game:
    name = "base"
    full_name = "H.A.T.S. demo"

    def __init__(self, *args):
        self.game_token = secrets.token_urlsafe(16)
        self.lock = threading.Lock()
        self.sessions = set()
        self.players = {}

    def get_session(self, game_token, session_token):
        with self.lock:
            player = None
            print(repr(self.game_token))
            print(repr(self.sessions))
            print(repr(game_token) + repr(session_token))
            if game_token == self.game_token and session_token in self.sessions:
                if session_token in self.players:
                    player = self.players[session_token].get_id()
            else:
                session_token = secrets.token_urlsafe(16)
                self.sessions.add(session_token)
            return { "game_token": self.game_token,
                     "session_token": session_token,
                     "player": player
                    }
