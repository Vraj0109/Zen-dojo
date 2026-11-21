from typing import List

class Solution:
    def oddManOut(self, codes: List[int]) -> int:
        n = len(codes)
        for i in range(n):
            count = 0
            for j in range(n):
                if codes[i] == codes[j]:
                    count += 1
            if count == 1:
                return codes[i]
        return -1
