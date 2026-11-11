class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        intervals.sort()
        out: List[List[int]] = []
        for iv in intervals:
            if out and iv[0] <= out[-1][1]:
                out[-1][1] = max(out[-1][1], iv[1])
            else:
                out.append(list(iv))
        return out
