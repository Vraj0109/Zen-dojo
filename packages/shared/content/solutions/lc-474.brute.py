class Solution:
    def findMaxForm(self, strs: list[str], m: int, n: int) -> int:
        items = [(s.count('0'), len(s) - s.count('0')) for s in strs]

        def dfs(idx: int, cur_m: int, cur_n: int) -> int:
            if idx == len(items):
                return 0
            # Option 1: skip
            res = dfs(idx + 1, cur_m, cur_n)
            # Option 2: take
            z, o = items[idx]
            if cur_m >= z and cur_n >= o:
                res = max(res, 1 + dfs(idx + 1, cur_m - z, cur_n - o))
            return res

        return dfs(0, m, n)
