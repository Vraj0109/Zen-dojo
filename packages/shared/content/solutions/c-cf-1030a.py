from typing import List

class Solution:
    def evaluateDifficulty(self, opinions: List[int]) -> str:
        return "HARD" if 1 in opinions else "EASY"
