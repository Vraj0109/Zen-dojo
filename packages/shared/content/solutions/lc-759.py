class Solution:
    def employeeFreeTime(self, intervals: List[List[int]]) -> List[List[int]]:
        if not intervals:
            return []
        intervals.sort(key=lambda x: (x[0], x[1]))

        res = []
        cur_end = intervals[0][1]
        for i in range(1, len(intervals)):
            if intervals[i][0] > cur_end:
                res.append([cur_end, intervals[i][0]])
                cur_end = intervals[i][1]
            else:
                cur_end = max(cur_end, intervals[i][1])
        return res
