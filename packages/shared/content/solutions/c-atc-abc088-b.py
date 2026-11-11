from typing import List

class Solution:
    def cardGame(self, cards: List[int]) -> int:
        cards.sort(reverse=True)
        diff = 0
        for i, val in enumerate(cards):
            diff += val if i % 2 == 0 else -val
        return diff
