from typing import List

class Solution:
    def calculateSpans(self, prices: List[int]) -> List[int]:
        res = []
        st = []
        for p in prices:
            span = 1
            while st and st[-1][0] <= p:
                span += st.pop()[1]
            st.append((p, span))
            res.append(span)
        return res
