class Solution:
    def determineChessWinner(self, s: str) -> str:
        a = s.count('A')
        d = s.count('D')
        if a > d:
            return "Anton"
        if d > a:
            return "Danik"
        return "Friendship"
