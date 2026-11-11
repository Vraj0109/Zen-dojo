N = 200000
_om = bytearray(N + 1)
for _p in range(2, N + 1):
    if _om[_p] == 0:
        _om[_p::_p] = [x + 1 for x in _om[_p::_p]]

class Solution:
    def consecutiveDistinct(self, k: int, count: int) -> int:
        run = 0
        for x in range(2, N + 1):
            if _om[x] == k:
                run += 1
                if run == count:
                    return x - count + 1
            else:
                run = 0
        return -1
