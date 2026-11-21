from typing import List

class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        res = [list(iv) for iv in intervals]
        merged = True
        while merged:
            merged = False
            for i in range(len(res)):
                for j in range(i + 1, len(res)):
                    if max(res[i][0], res[j][0]) <= min(res[i][1], res[j][1]):
                        res[i][0] = min(res[i][0], res[j][0])
                        res[i][1] = max(res[i][1], res[j][1])
                        res.pop(j)
                        merged = True
                        break
                if merged:
                    break
        res.sort(key=lambda x: x[0])
        return res
