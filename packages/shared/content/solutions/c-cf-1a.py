class Solution:
    def flagstones(self, n: int, m: int, a: int) -> int:
        x = (n + a - 1) // a
        y = (m + a - 1) // a
        return x * y
