# verify: skip-stress
class Solution:
    def minimumDifference(self, nums: List[int]) -> int:
        n2 = len(nums)
        n = n2 // 2
        total = sum(nums)

        left = [[] for _ in range(n + 1)]
        right = [[] for _ in range(n + 1)]
        for mask in range(1 << n):
            cnt = bin(mask).count('1')
            s1 = sum(nums[i] for i in range(n) if mask & (1 << i))
            s2 = sum(nums[n + i] for i in range(n) if mask & (1 << i))
            left[cnt].append(s1)
            right[cnt].append(s2)

        for k in range(n + 1):
            right[k].sort()

        ans = float('inf')
        for k in range(n + 1):
            need = n - k
            r_list = right[need]
            for s1 in left[k]:
                target = (total - 2 * s1) / 2
                pos = bisect.bisect_left(r_list, target)
                if pos < len(r_list):
                    s2 = r_list[pos]
                    ans = min(ans, abs(total - 2 * (s1 + s2)))
                if pos > 0:
                    s2 = r_list[pos - 1]
                    ans = min(ans, abs(total - 2 * (s1 + s2)))

        return ans
