class Solution:
    def numberWays(self, hats: List[List[int]]) -> int:
        n = len(hats)
        MOD = 10**9 + 7
        hat_to_people = [[] for _ in range(41)]
        for p in range(n):
            for h in hats[p]:
                hat_to_people[h].append(p)

        target_mask = (1 << n) - 1
        dp = [0] * (1 << n)
        dp[0] = 1

        for h in range(1, 41):
            next_dp = dp[:]
            for p in hat_to_people[h]:
                p_bit = 1 << p
                for mask in range(target_mask + 1):
                    if (mask & p_bit) == 0 and dp[mask] > 0:
                        next_dp[mask | p_bit] = (next_dp[mask | p_bit] + dp[mask]) % MOD
            dp = next_dp

        return dp[target_mask]
