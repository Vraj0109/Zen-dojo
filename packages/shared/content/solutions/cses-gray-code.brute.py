from typing import List

class Solution:
    def grayCode(self, n: int) -> List[str]:
        if n == 1:
            return ["0", "1"]
        prev = self.grayCode(n - 1)
        return ["0" + s for s in prev] + ["1" + s for s in reversed(prev)]
