# verify: skip-stress
class Solution:
    def countingNecklaces(self, n: int, m: int) -> int:
        MOD = 1_000_000_007
        def get_phi(x):
            result = x
            p = 2
            while p * p <= x:
                if x % p == 0:
                    while x % p == 0:
                        x //= p
                    result -= result // p
                p += 1
            if x > 1:
                result -= result // x
            return result
        total_sum = 0
        d = 1
        while d * d <= n:
            if n % d == 0:
                phi1 = get_phi(n // d) % MOD
                term1 = (phi1 * pow(m, d, MOD)) % MOD
                total_sum = (total_sum + term1) % MOD
                if d * d != n:
                    d2 = n // d
                    phi2 = get_phi(n // d2) % MOD
                    term2 = (phi2 * pow(m, d2, MOD)) % MOD
                    total_sum = (total_sum + term2) % MOD
            d += 1
        ans = (total_sum * pow(n, MOD - 2, MOD)) % MOD
        return ans