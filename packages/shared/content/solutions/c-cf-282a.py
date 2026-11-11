from typing import List

class Solution:
    def executeBitProgram(self, statements: List[str]) -> int:
        x = 0
        for s in statements:
            if '+' in s:
                x += 1
            else:
                x -= 1
        return x
