class Solution:
    def minMeetingRooms(self, intervals: list[list[int]]) -> int:
        if not intervals:
            return 0
        n = len(intervals)
        max_rooms = 0
        for i in range(n):
            t = intervals[i][0]
            count = 0
            for j in range(n):
                if intervals[j][0] <= t < intervals[j][1]:
                    count += 1
            max_rooms = max(max_rooms, count)
        return max_rooms
