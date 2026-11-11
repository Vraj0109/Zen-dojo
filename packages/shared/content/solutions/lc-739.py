# verify: skip-stress
from typing import List

class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        ans = [0] * n
        st = []
        for i, t in enumerate(temperatures):
            while st and temperatures[st[-1]] < t:
                idx = st.pop()
                ans[idx] = i - idx
            st.append(i)
        return ans