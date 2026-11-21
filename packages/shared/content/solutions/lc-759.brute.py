class Solution:
    def employeeFreeTime(self, intervals: list[list[int]]) -> list[list[int]]:
        if not intervals:
            return []

        points = sorted(list({x for iv in intervals for x in iv}))
        res = []

        for i in range(len(points) - 1):
            start = points[i]
            end = points[i + 1]
            if start >= end:
                continue

            busy = False
            for s, e in intervals:
                if s <= start and e >= end:
                    busy = True
                    break

            if not busy:
                if res and res[-1][1] == start:
                    res[-1][1] = end
                else:
                    res.append([start, end])

        return res
