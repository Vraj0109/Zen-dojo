import itertools

class Solution:
    def digitPowerSum(self, p: int) -> int:
        pw = [d ** p for d in range(10)]
        limit = (p + 1) * pw[9]
        max_d = len(str(limit))
        ans = 0
        for L in range(2, max_d + 1):
            for combo in itertools.combinations_with_replacement(range(10), L):
                s = sum(pw[d] for d in combo)
                if s >= 10:
                    s_digits = [int(x) for x in str(s)]
                    if len(s_digits) == L and sorted(s_digits) == list(combo):
                        ans += s
        return ans
