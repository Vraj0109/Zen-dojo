from typing import List

class Solution:
    def towerOfHanoi(self, n: int) -> List[List[int]]:
        out = []

        def go(count: int, from_peg: int, to_peg: int, via_peg: int) -> None:
            if count == 0:
                return
            go(count - 1, from_peg, via_peg, to_peg)
            out.append([from_peg, to_peg])
            go(count - 1, via_peg, to_peg, from_peg)

        go(n, 1, 3, 2)
        return out
