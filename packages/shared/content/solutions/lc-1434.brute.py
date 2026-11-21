class Solution:
    def numberWays(self, hats: list[list[int]]) -> int:
        n = len(hats)
        MOD = 1_000_000_007
        used_hats = set()
        ways = 0

        def backtrack(person: int):
            nonlocal ways
            if person == n:
                ways = (ways + 1) % MOD
                return
            for h in hats[person]:
                if h not in used_hats:
                    used_hats.add(h)
                    backtrack(person + 1)
                    used_hats.remove(h)

        backtrack(0)
        return ways
