import bisect

class MyCalendar:
    def __init__(self):
        self.starts = []
        self.ends = []

    def book(self, startTime: int, endTime: int) -> bool:
        idx = bisect.bisect_right(self.starts, startTime)
        if idx < len(self.starts) and self.starts[idx] < endTime:
            return False
        if idx > 0 and self.ends[idx - 1] > startTime:
            return False
        self.starts.insert(idx, startTime)
        self.ends.insert(idx, endTime)
        return True
