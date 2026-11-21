import random

class Solution:
    def __init__(self, w: list[int]):
        self.weights = w

    def pickIndex(self) -> int:
        total = sum(self.weights)
        target = random.randint(1, total)
        running = 0
        for i, weight in enumerate(self.weights):
            running += weight
            if running >= target:
                return i
        return len(self.weights) - 1
