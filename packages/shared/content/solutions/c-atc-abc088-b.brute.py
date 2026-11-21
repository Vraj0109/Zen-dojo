from typing import List

class Solution:
    def cardGame(self, cards: List[int]) -> int:
        n = len(cards)
        used = [False] * n
        alice = 0
        bob = 0
        for turn in range(n):
            max_idx = -1
            for i in range(n):
                if not used[i]:
                    if max_idx == -1 or cards[i] > cards[max_idx]:
                        max_idx = i
            used[max_idx] = True
            if turn % 2 == 0:
                alice += cards[max_idx]
            else:
                bob += cards[max_idx]
        return alice - bob
