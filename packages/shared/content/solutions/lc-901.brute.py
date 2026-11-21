from typing import List

class Solution:
    def calculateSpans(self, prices: List[int]) -> List[int]:
        res = []
        for i in range(len(prices)):
            span = 0
            for j in range(i, -1, -1):
                if prices[j] <= prices[i]:
                    span += 1
                else:
                    break
            res.append(span)
        return res
