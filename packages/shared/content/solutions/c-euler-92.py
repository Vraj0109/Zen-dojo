from functools import lru_cache

class Solution:
    def squareDigitChains(self, limit: int) -> int:
        if limit <= 1:
            return 0
        squares = [d * d for d in range(10)]
        to89 = [0] * 800
        for v in range(1, 800):
            x = v
            while x != 1 and x != 89:
                s = 0
                m = x
                while m > 0:
                    s += squares[m % 10]
                    m //= 10
                x = s
            to89[v] = 1 if x == 89 else 0

        s_limit = str(limit - 1)
        n_digits = len(s_limit)

        @lru_cache(maxsize=None)
        def dp(idx: int, less: bool, sq_sum: int) -> int:
            if idx == n_digits:
                return to89[sq_sum] if sq_sum > 0 else 0
            limit_digit = int(s_limit[idx]) if not less else 9
            res = 0
            for d in range(limit_digit + 1):
                res += dp(idx + 1, less or (d < limit_digit), sq_sum + squares[d])
            return res

        return dp(0, False, 0)
