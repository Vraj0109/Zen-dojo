from typing import List

class Solution:
    def nearestSmallerValues(self, arr: List[int]) -> List[int]:
        ans = []
        st = []
        for i, val in enumerate(arr):
            while st and st[-1][0] >= val:
                st.pop()
            if not st:
                ans.append(0)
            else:
                ans.append(st[-1][1])
            st.append((val, i + 1))
        return ans
