class Solution:
    def longestCollatzStart(self, limit: int) -> int:
        length = [0] * limit
        length[1] = 1
        best = 1
        for s in range(2, limit):
            x = s
            steps = 0
            while x >= s:
                x = x // 2 if x % 2 == 0 else 3 * x + 1
                steps += 1
            length[s] = steps + length[x]
            if length[s] > length[best]:
                best = s
        return best
