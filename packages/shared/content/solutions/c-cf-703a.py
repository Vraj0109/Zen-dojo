from typing import List

class Solution:
    def diceGameWinner(self, rounds: List[List[int]]) -> str:
        mWins = 0
        cWins = 0
        for r in rounds:
            if r[0] > r[1]:
                mWins += 1
            elif r[1] > r[0]:
                cWins += 1
        if mWins > cWins:
            return "Mishka"
        if cWins > mWins:
            return "Chris"
        return "Friendship is magic!^^"
