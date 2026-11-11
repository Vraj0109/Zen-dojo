# verify: skip-stress
from typing import List
from collections import defaultdict

class Solution:
    def totalFruit(self, fruits: List[int]) -> int:
        basket = defaultdict(int)
        left = 0
        best = 0
        for right, x in enumerate(fruits):
            basket[x] += 1
            while len(basket) > 2:
                basket[fruits[left]] -= 1
                if basket[fruits[left]] == 0:
                    del basket[fruits[left]]
                left += 1
            best = max(best, right - left + 1)
        return best