# verify: skip-stress
from typing import List

class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        a, b = nums1, nums2
        if len(a) > len(b):
            a, b = b, a
        m, n = len(a), len(b)
        lo, hi = 0, m
        half = (m + n + 1) // 2
        INF = float('inf')
        while lo <= hi:
            i = (lo + hi) // 2
            j = half - i
            aL = a[i - 1] if i > 0 else -INF
            aR = a[i] if i < m else INF
            bL = b[j - 1] if j > 0 else -INF
            bR = b[j] if j < n else INF
            if aL <= bR and bL <= aR:
                left = max(aL, bL)
                if (m + n) % 2 != 0:
                    return float(left)
                return (left + min(aR, bR)) / 2.0
            if aL > bR:
                hi = i - 1
            else:
                lo = i + 1
        return 0.0