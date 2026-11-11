class Solution:
    def minAbsDifference(self, nums: List[int], goal: int) -> int:
        def get_sums(v):
            out = [0]
            for x in v:
                out += [s + x for s in out]
            return out

        n = len(nums)
        mid = n // 2
        s1 = get_sums(nums[:mid])
        s2 = sorted(set(get_sums(nums[mid:])))

        best = abs(goal)
        for x in s1:
            target = goal - x
            pos = bisect.bisect_left(s2, target)
            if pos < len(s2):
                best = min(best, abs(x + s2[pos] - goal))
            if pos > 0:
                best = min(best, abs(x + s2[pos - 1] - goal))
        return best
