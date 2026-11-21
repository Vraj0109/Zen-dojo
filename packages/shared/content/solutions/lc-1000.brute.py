class Solution:
    def mergeStones(self, stones: list[int], k: int) -> int:
        n = len(stones)
        if (n - 1) % (k - 1) != 0:
            return -1

        pre = [0] * (n + 1)
        for i in range(n):
            pre[i + 1] = pre[i] + stones[i]

        memo = {}

        def solve(i: int, j: int) -> int:
            if i == j:
                return 0
            if (i, j) in memo:
                return memo[(i, j)]

            ans = float('inf')
            for m in range(i, j, k - 1):
                ans = min(ans, solve(i, m) + solve(m + 1, j))

            if (j - i) % (k - 1) == 0:
                ans += pre[j + 1] - pre[i]

            memo[(i, j)] = ans
            return ans

        return int(solve(0, n - 1))
