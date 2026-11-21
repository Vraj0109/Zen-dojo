class Solution:
    def detectCycle(self, nums: list[int], pos: int) -> int:
        n = len(nums)
        if n == 0:
            return -1
        visited = set()
        cur = 0
        while cur >= 0:
            if cur in visited:
                return cur
            visited.add(cur)
            cur = cur + 1 if cur + 1 < n else pos
        return -1
