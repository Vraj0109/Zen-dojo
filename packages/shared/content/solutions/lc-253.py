class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        if not intervals:
            return 0
        n = len(intervals)
        starts = sorted(iv[0] for iv in intervals)
        ends = sorted(iv[1] for iv in intervals)

        rooms = 0
        end_idx = 0
        for i in range(n):
            if starts[i] < ends[end_idx]:
                rooms += 1
            else:
                end_idx += 1
        return rooms
